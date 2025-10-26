# ギラ飲み機能 データベースセットアップガイド

## 概要

このドキュメントでは、ギラ飲み機能のデータベーステーブルの作成とサンプルデータの投入方法を説明します。

---

## 必要なテーブル

ギラ飲み機能では以下の5つのテーブルを使用します：

1. **Restaurants** - 店舗情報
2. **PostMatchChats** - 試合後チャット
3. **PostMatchChatMessages** - チャットメッセージ
4. **RestaurantShares** - 店舗共有履歴
5. **ChatParticipants** - チャット参加者の既読/参加状況

詳細なスキーマ定義は [`DATABASE_DESIGN.md`](./DATABASE_DESIGN.md) を参照してください。

---

## セットアップ手順

### 1. DynamoDB Localの起動

ローカル開発環境でDynamoDB Localを起動します。

```bash
cd hakkutsu-api
docker-compose up -d dynamodb-local
```

DynamoDB Localが `http://localhost:8000` で起動していることを確認してください。

---

### 2. テーブルの作成

AWS CLIを使用してテーブルを作成します。

#### 2.1 Restaurants テーブル

```bash
aws dynamodb create-table \
  --table-name Restaurants \
  --attribute-definitions \
    AttributeName=restaurant_id,AttributeType=S \
    AttributeName=venue,AttributeType=S \
    AttributeName=distance,AttributeType=N \
    AttributeName=name,AttributeType=S \
  --key-schema \
    AttributeName=restaurant_id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "VenueDistanceIndex",
        "KeySchema": [
          {"AttributeName": "venue", "KeyType": "HASH"},
          {"AttributeName": "distance", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "VenueNameIndex",
        "KeySchema": [
          {"AttributeName": "venue", "KeyType": "HASH"},
          {"AttributeName": "name", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

#### 2.2 PostMatchChats テーブル

```bash
aws dynamodb create-table \
  --table-name PostMatchChats \
  --attribute-definitions \
    AttributeName=chat_id,AttributeType=S \
    AttributeName=match_id,AttributeType=S \
  --key-schema \
    AttributeName=chat_id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "MatchIdIndex",
        "KeySchema": [
          {"AttributeName": "match_id", "KeyType": "HASH"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

#### 2.3 PostMatchChatMessages テーブル

```bash
aws dynamodb create-table \
  --table-name PostMatchChatMessages \
  --attribute-definitions \
    AttributeName=message_id,AttributeType=S \
    AttributeName=chat_id,AttributeType=S \
    AttributeName=created_at,AttributeType=S \
    AttributeName=user_id,AttributeType=S \
  --key-schema \
    AttributeName=message_id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "ChatIdCreatedAtIndex",
        "KeySchema": [
          {"AttributeName": "chat_id", "KeyType": "HASH"},
          {"AttributeName": "created_at", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "UserIdCreatedAtIndex",
        "KeySchema": [
          {"AttributeName": "user_id", "KeyType": "HASH"},
          {"AttributeName": "created_at", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

#### 2.4 RestaurantShares テーブル

```bash
aws dynamodb create-table \
  --table-name RestaurantShares \
  --attribute-definitions \
    AttributeName=share_id,AttributeType=S \
    AttributeName=chat_id,AttributeType=S \
    AttributeName=restaurant_id,AttributeType=S \
    AttributeName=created_at,AttributeType=S \
  --key-schema \
    AttributeName=share_id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "ChatIdRestaurantIdIndex",
        "KeySchema": [
          {"AttributeName": "chat_id", "KeyType": "HASH"},
          {"AttributeName": "restaurant_id", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "RestaurantIdCreatedAtIndex",
        "KeySchema": [
          {"AttributeName": "restaurant_id", "KeyType": "HASH"},
          {"AttributeName": "created_at", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

#### 2.5 ChatParticipants テーブル

```bash
aws dynamodb create-table \
  --table-name ChatParticipants \
  --attribute-definitions \
    AttributeName=chat_id,AttributeType=S \
    AttributeName=user_id,AttributeType=S \
  --key-schema \
    AttributeName=chat_id,KeyType=HASH \
    AttributeName=user_id,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

---

### 3. テーブル作成の確認

作成されたテーブルを確認します。

```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

以下のテーブルが表示されることを確認してください：

- Restaurants
- PostMatchChats
- PostMatchChatMessages
- RestaurantShares
- ChatParticipants

---

### 4. サンプルデータの投入

提供されているスクリプトを使用してサンプルデータを投入します。

```bash
cd hakkutsu-api
node scripts/seed-giranomi-data.js
```

#### 投入されるデータ

- **店舗**: 5件
  - 居酒屋 ギラ
  - 焼き鳥 北九
  - スタジアムカフェ
  - ラーメン ギラ軒
  - バル デ ギラヴァンツ

- **チャット**: 1件（テスト用）
- **メッセージ**: 5件（店舗付きメッセージを含む）
- **店舗共有履歴**: 2件

---

### 5. データの確認

DynamoDB Localに投入されたデータを確認します。

#### 5.1 店舗データの確認

```bash
aws dynamodb scan \
  --table-name Restaurants \
  --endpoint-url http://localhost:8000
```

#### 5.2 チャットデータの確認

```bash
aws dynamodb scan \
  --table-name PostMatchChats \
  --endpoint-url http://localhost:8000
```

#### 5.3 メッセージデータの確認

```bash
aws dynamodb scan \
  --table-name PostMatchChatMessages \
  --endpoint-url http://localhost:8000
```

---

### 6. フロントエンドでの確認

ブラウザで以下のURLにアクセスして、ギラ飲みチャット画面を確認します。

```
http://localhost:3000/dashboard
```

ダッシュボードの「ギラ飲みチャット（テスト）」ボタンをクリックすると、投入したサンプルデータが表示されます。

---

## トラブルシューティング

### テーブル作成時のエラー

**エラー**: `ResourceInUseException: Table already exists`

**解決方法**: テーブルが既に存在する場合は、削除してから再作成します。

```bash
aws dynamodb delete-table --table-name Restaurants --endpoint-url http://localhost:8000
aws dynamodb delete-table --table-name PostMatchChats --endpoint-url http://localhost:8000
aws dynamodb delete-table --table-name PostMatchChatMessages --endpoint-url http://localhost:8000
aws dynamodb delete-table --table-name RestaurantShares --endpoint-url http://localhost:8000
```

### DynamoDB Localに接続できない

**確認事項**:

1. Docker が起動しているか確認
   ```bash
   docker ps
   ```

2. DynamoDB Localコンテナが起動しているか確認
   ```bash
   docker-compose ps
   ```

3. ポート8000が使用可能か確認
   ```bash
   lsof -i :8000
   ```

### サンプルデータ投入スクリプトのエラー

**エラー**: `Cannot find module 'uuid'`

**解決方法**: 必要なパッケージをインストールします。

```bash
cd hakkutsu-api
npm install
```

---

## 本番環境へのデプロイ

本番環境（AWS DynamoDB）へデプロイする場合は、以下の手順を実行します。

### 1. SAM テンプレートの更新（またはスクリプトで作成）

本リポジトリは Serverless Framework を使用しません。AWS SAM を使用します。
追加のDynamoDBリソースが必要な場合は、`hakkutsu-api/template.yaml` に追記するか、
用意済みのスクリプト（`hakkutsu-api/scripts/create-giranomi-tables.sh`）を使って作成してください。

テンプレートに追記する場合の例（抜粋）:

```yaml
Resources:
  RestaurantsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub restaurants-${StageName}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: restaurant_id
          AttributeType: S
      KeySchema:
        - AttributeName: restaurant_id
          KeyType: HASH
```

スクリプトを使う場合:

```bash
cd hakkutsu-api
chmod +x scripts/create-giranomi-tables.sh
./scripts/create-giranomi-tables.sh
```

### 2. デプロイ（AWS SAM）

```bash
cd hakkutsu-api
sam build
sam deploy --guided
```

### 3. 本番データの投入

本番環境用のスクリプトを実行します（エンドポイントを変更）。

```bash
# スクリプト内のendpointをコメントアウトして実行
node scripts/seed-giranomi-data.js
```

---

## 参考資料

- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) - データベース設計ドキュメント
- [GIRA-NOMI-IMPLEMENTATION.md](./GIRA-NOMI-IMPLEMENTATION.md) - ギラ飲み機能実装計画
- [AWS DynamoDB ドキュメント](https://docs.aws.amazon.com/dynamodb/)

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-10-25 | 1.0.0 | 初版作成 |
