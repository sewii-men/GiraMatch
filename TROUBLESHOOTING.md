# トラブルシューティングガイド

## `/matching/recruitments` エンドポイントの HTTP 500 エラー

### 問題の概要
GitHub Actions のデプロイワークフローで、`/matching/recruitments` エンドポイントが HTTP 500 エラーを返しています。

### 考えられる原因

1. **DynamoDB テーブルが存在しない**
   - `recruitments-table-{stage}` テーブルが AWS に作成されていない可能性があります。

2. **環境変数が設定されていない**
   - Lambda 関数に `RECRUITMENTS_TABLE` 環境変数が正しく設定されていない可能性があります。

3. **IAM 権限の問題**
   - Lambda 関数が DynamoDB テーブルにアクセスする権限を持っていない可能性があります。

4. **テーブル定義の問題**
   - `template.yaml` の DynamoDB テーブル定義に問題がある可能性があります。

### 診断手順

#### 1. ローカル環境でテスト

```bash
# Docker Compose で API を起動
docker-compose up -d

# ヘルスチェックを実行
./hakkutsu-api/test-health.sh http://localhost:4000
```

#### 2. AWS 環境の確認

```bash
# CloudFormation スタックの確認
aws cloudformation describe-stacks --stack-name hakkutsu-api-dev

# DynamoDB テーブルの確認
aws dynamodb list-tables | grep recruitments

# Lambda 関数の環境変数を確認
aws lambda get-function-configuration --function-name <function-name> | jq '.Environment.Variables'
```

#### 3. CloudWatch Logs の確認

```bash
# Lambda 関数のログを確認
aws logs tail /aws/lambda/<function-name> --follow
```

### 解決策

#### 修正内容

1. **エラーハンドリングの改善**
   - `/matching/recruitments` エンドポイントに詳細なエラーログを追加しました。
   - 環境変数が設定されていない場合のチェックを追加しました。

2. **DynamoDB テーブル定義の修正**
   - `RequestsTable` に `RequesterIdIndex` GSI を追加しました。
   - 必要な `AttributeDefinitions` を追加しました。

3. **ヘルスチェックの改善**
   - GitHub Actions のヘルスチェックでエラーレスポンスの内容を表示するようにしました。

4. **テストスクリプトの追加**
   - `package.json` に `test` と `lint` スクリプトを追加しました。

#### 再デプロイ手順

```bash
# 変更をコミット
git add .
git commit -m "fix: improve error handling and fix DynamoDB table definitions"

# デプロイ（develop ブランチの場合）
git push origin develop

# または手動デプロイ
cd hakkutsu-api
sam build
sam deploy --stack-name hakkutsu-api-dev --parameter-overrides StageName=dev
```

### 予防策

1. **ローカルテストの実施**
   - デプロイ前に必ずローカル環境でテストを実行してください。

2. **段階的なデプロイ**
   - まず dev 環境にデプロイして動作確認を行ってから、prod 環境にデプロイしてください。

3. **モニタリングの設定**
   - CloudWatch Alarms を設定して、エラー率が高い場合に通知を受け取るようにしてください。

4. **統合テストの追加**
   - API エンドポイントの統合テストを追加して、CI/CD パイプラインで自動的にテストを実行するようにしてください。

## その他の問題

### CORS エラー

フロントエンドから API にアクセスできない場合は、`ALLOWED_ORIGINS` 環境変数を確認してください。

```bash
# template.yaml の AllowedOrigins パラメータを確認
# または SAM デプロイ時に指定
sam deploy --parameter-overrides AllowedOrigins="https://your-frontend-url.com"
```

### 認証エラー

JWT トークンが無効な場合は、`JWT_SECRET` 環境変数が一致しているか確認してください。

```bash
# 環境変数を確認
aws lambda get-function-configuration --function-name <function-name> | jq '.Environment.Variables.JWT_SECRET'
```
