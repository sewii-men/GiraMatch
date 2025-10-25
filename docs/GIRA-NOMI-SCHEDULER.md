# ギラ飲みチャット スケジューラー設定ガイド

ギラ飲み機能では、試合終了後にチャットを自動開設し、その日の23:59にクローズする必要があります。本書では AWS EventBridge Scheduler を利用して `POST /matches/{matchId}/post-match-chat/create` と `POST /post-match-chats/{chatId}/close` を自動実行する手順をまとめます。

## 前提条件

- API Gateway + Lambda (serverless-http) がデプロイ済みで、HTTPS エンドポイントを取得していること。
- `SYSTEM_API_TOKEN` 環境変数を本番環境へ設定済みであること。
- 試合情報 (`Matches` テーブル) に、試合日時 (`date`, `time`) が保存されていること。
- `aws` CLI v2 以降を利用し、適切な IAM 権限 (EventBridge Scheduler, IAM role 作成, Secrets Manager/SSM パラメータ読み取り等) を持っていること。

## 1. API 宛の認証付き ApiDestination を作成

EventBridge Scheduler から直接 HTTP エンドポイントを呼ぶために `ApiDestination` を使います。`Authorization: Bearer <SYSTEM_API_TOKEN>` をヘッダーに付与するため、`Connection` の認証タイプに `API_KEY` を指定し、キー値として `SYSTEM_API_TOKEN` を登録します。

```bash
aws events create-connection \
  --name giranomi-system-connection \
  --authorization-type API_KEY \
  --auth-parameters AuthorizationParametersKeyName=Authorization,ApiKeyValue="Bearer ${SYSTEM_API_TOKEN}"

aws events create-api-destination \
  --name giranomi-chat-create \
  --connection-arn $(aws events describe-connection --name giranomi-system-connection --query 'ConnectionArn' --output text) \
  --invocation-endpoint "https://<api-domain>/matches/{matchId}/post-match-chat/create" \
  --http-method POST

aws events create-api-destination \
  --name giranomi-chat-close \
  --connection-arn $(aws events describe-connection --name giranomi-system-connection --query 'ConnectionArn' --output text) \
  --invocation-endpoint "https://<api-domain>/post-match-chats/{chatId}/close" \
  --http-method POST

aws events create-api-destination \
  --name giranomi-chat-notify \
  --connection-arn $(aws events describe-connection --name giranomi-system-connection --query 'ConnectionArn' --output text) \
  --invocation-endpoint "https://<api-domain>/post-match-chats/{chatId}/notify" \
  --http-method POST
```

> **Tips**: デプロイ環境が複数ある場合は `<api-domain>` をステージごとに分けた `ApiDestination` を作成してください。

## 2. 試合ごとのチャット自動作成スケジュール

EventBridge Scheduler を使うと、任意の日時に単発または繰り返しで API を呼び出せます。試合終了予定時刻に合わせてチャットを作成し、必要に応じて通知 API も続けて叩きます。

```bash
aws scheduler create-schedule \
  --name giranomi-create-chat-<matchId> \
  --schedule-expression "at(2025-03-15T16:00:00+09:00)" \
  --flexible-time-window "Mode=OFF" \
  --target "Arn=$(aws events describe-api-destination --name giranomi-chat-create --query 'ApiDestinationArn' --output text),RoleArn=<eventbridge-scheduler-role-arn>,Input='{\"endTime\":\"2025-03-15T23:59:59+09:00\"}'"

# 任意: 作成直後の通知を送る場合
aws scheduler create-schedule \
  --name giranomi-notify-chat-<matchId> \
  --schedule-expression "at(2025-03-15T16:05:00+09:00)" \
  --flexible-time-window "Mode=OFF" \
  --target "Arn=$(aws events describe-api-destination --name giranomi-chat-notify --query 'ApiDestinationArn' --output text),RoleArn=<eventbridge-scheduler-role-arn>,Input='{\"type\":\"chat_opened\",\"message\":\"ギラ飲みチャットが開設されました！\"}'"
```

- `schedule-expression` は試合終了予定（例: 90分 + ハーフタイム + α）に合わせて設定します。
- `Input` には JSON 形式で `endTime` を渡せます。省略すると API 側で 23:59 に自動設定されます。
- `RoleArn` は EventBridge Scheduler が ApiDestination を呼び出すための IAM ロールです（`events:InvokeApiDestination` を許可）。

### 複数試合を一括作成する場合

Fixture 情報を CSV などで管理し、スクリプトで `aws scheduler create-schedule` をループ実行するのがおすすめです。再スケジュール時は `update-schedule` を実行してください。

## 3. チャット一括クローズスケジュール

毎日 23:59 (JST) にその日のチャットを強制クローズする場合は、`EventBridge Schedule` の `cron` 式で設定します。クローズ対象の `chatId` は `pmc_<matchId>_<timestamp>` 形式のため、実運用では DynamoDB を走査して当日開設済みのチャット ID を抽出し、複数回 API を呼ぶ Lambda を噛ませる方法が現実的です。

最小構成として、前述の ApiDestination を直接叩く単発スケジュールの例を示します。

```bash
aws scheduler create-schedule \
  --name giranomi-close-chat-<chatId> \
  --schedule-expression "cron(59 14 * * ? *)" \
  --flexible-time-window "Mode=OFF" \
  --target "Arn=$(aws events describe-api-destination --name giranomi-chat-close --query 'ApiDestinationArn' --output text),RoleArn=<eventbridge-scheduler-role-arn>,Input='{}'"
```

> `cron(59 14 * * ? *)` は UTC 14:59 (= JST 23:59) を意味します。

## 4. Lambda でチャット ID を自動解決するパターン

より自動化するには、次のような専用 Lambda を追加し、EventBridge から 2 回呼び出します。

1. **Create Trigger Lambda**: 試合情報を参照し、対象 `matchId` を決定 → `POST /matches/{matchId}/post-match-chat/create` を呼ぶ。
2. **Close Trigger Lambda**: 当日 `is_closed=false` のチャットを DynamoDB から抽出し、`POST /post-match-chats/{chatId}/close` を順次呼ぶ。

上記 Lambda から API を呼ぶ場合も `SYSTEM_API_TOKEN` を `Authorization` ヘッダーに付けてください。

## 5. 運用チェックリスト

- [ ] `SYSTEM_API_TOKEN` が Secrets Manager / SSM Parameter Store で安全に管理されている。
- [ ] EventBridge Scheduler が利用する IAM ロールに `events:InvokeApiDestination` 権限を付与済み。
- [ ] 試合日程の更新時に Scheduler を忘れず更新する運用フローを整備。
- [ ] CloudWatch Logs / EventBridge DLQ を設定し、呼び出し失敗時に検知できるようにする。

これで Phase 8 の「チャット自動開設/クローズ」の仕組みを構築できます。詳しい設計や自動化は、上記を基に環境に合わせてカスタマイズしてください。
