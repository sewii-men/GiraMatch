# データベース設計ドキュメント

## 概要

**Giravent**（ギラベント）は、ギラヴァンツ北九州のファンが試合観戦の同行者を見つけるマッチングアプリです。このドキュメントでは、アプリケーションのデータベース設計について詳しく説明します。

## 使用技術

- **データベース**: AWS DynamoDB
- **ローカル開発**: DynamoDB Local (Docker)
- **ORM/SDK**: AWS SDK v3 (@aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb)

## データベース選定理由

### なぜDynamoDBを選んだか

1. **既存インフラとの親和性**
   - Serverless Framework + AWS Lambdaとの統合が容易
   - 既に環境が構築済み（serverless.yml、Docker Compose）

2. **スケーラビリティ**
   - 自動スケーリング対応
   - トラフィック増加時も安定したパフォーマンス

3. **コスト効率**
   - 従量課金モデル（PAY_PER_REQUEST）
   - 初期費用なし、使った分だけ課金

4. **開発速度**
   - スキーマレス設計で柔軟な開発
   - マネージドサービスでインフラ管理不要

---

## テーブル設計

### 設計方針

- **Multi-Table Design**: 各エンティティごとに独立したテーブルを作成
- **アクセスパターン優先**: クエリパフォーマンスを最適化
- **GSI活用**: Global Secondary Indexで柔軟な検索を実現

---

## 全テーブル一覧

| # | テーブル名 | 説明 | 主キー | GSI |
|---|-----------|------|--------|-----|
| 1 | Users | ユーザー情報 | user_id | phone_number |
| 2 | Matches | 試合情報 | match_id | match_date, status |
| 3 | UserMatches | 試合参加情報 | user_match_id | user_id, match_id |
| 4 | MatchRequests | マッチングリクエスト | request_id | from_user_id, to_user_id, match_id |
| 5 | Conversations | 会話 | conversation_id | match_id |
| 6 | ConversationParticipants | 会話参加者 | participant_id | conversation_id, user_id |
| 7 | Messages | メッセージ | message_id | conversation_id |
| 8 | CheckIns | チェックイン | check_in_id | user_id, match_id |
| 9 | Reviews | レビュー・評価 | review_id | from_user_id, to_user_id, match_id |
| 10 | Restaurants | 店舗情報 | restaurant_id | venue, name |
| 11 | PostMatchChats | 試合後チャット | chat_id | match_id |
| 12 | PostMatchChatMessages | チャットメッセージ | message_id | chat_id, created_at |
| 13 | RestaurantShares | 店舗共有履歴 | share_id | chat_id, restaurant_id |

---

## 詳細テーブル定義

### 1. Users（ユーザー）

**説明**: ユーザーの基本情報と信頼スコアを管理

#### スキーマ

```json
{
  "user_id": "string (UUID)",          // PK
  "name": "string",                     // 本名
  "nickname": "string",                 // 表示名
  "icon": "string",                     // アイコン絵文字
  "phone_number": "string",             // 電話番号（SMS認証用）
  "phone_verified": "boolean",          // 認証済みフラグ
  "trust_score": "number (0.0-5.0)",    // 信頼スコア
  "bio": "string",                      // 自己紹介文
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

#### インデックス

- **Primary Key**: `user_id` (HASH)
- **GSI-1**: `phone_number` (HASH) - 電話番号でユーザー検索

#### アクセスパターン

- ユーザーIDで取得: `GetItem(user_id)`
- 電話番号で検索: `Query(GSI-1, phone_number)`

---

### 2. Matches（試合）

**説明**: サッカーの試合情報を管理

#### スキーマ

```json
{
  "match_id": "string (UUID)",          // PK
  "match_date": "string (ISO 8601)",    // 試合日時
  "opponent": "string",                 // 対戦相手
  "venue": "string",                    // 会場名
  "description": "string",              // 試合説明
  "status": "string",                   // upcoming, completed, cancelled
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

#### インデックス

- **Primary Key**: `match_id` (HASH)
- **GSI-1**: `status` (HASH) + `match_date` (RANGE) - ステータス別に日付順で取得

#### アクセスパターン

- 試合IDで取得: `GetItem(match_id)`
- 全試合を日付順で取得: `Query(GSI-1, status="upcoming")`

---

### 3. UserMatches（ユーザー試合参加）

**説明**: ユーザーの試合参加情報と観戦スタイルを管理

#### スキーマ

```json
{
  "user_match_id": "string (UUID)",              // PK
  "user_id": "string",                           // FK: Users
  "match_id": "string",                          // FK: Matches
  "participation_mode": "string",                // recruit, join
  "viewing_style": "string",                     // voice_support, quiet, photo, family
  "seat_preference": "string",                   // goal_behind, main_stand, back_stand, anywhere
  "status": "string",                            // active, matched, completed, cancelled
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

#### インデックス

- **Primary Key**: `user_match_id` (HASH)
- **GSI-1**: `user_id` (HASH) + `created_at` (RANGE) - ユーザーの参加履歴
- **GSI-2**: `match_id` (HASH) + `participation_mode` (RANGE) - 試合ごとの参加者一覧

#### アクセスパターン

- ユーザーの参加試合一覧: `Query(GSI-1, user_id)`
- 特定試合の参加者: `Query(GSI-2, match_id)`
- マッチング候補検索: `Query(GSI-2)` + アプリケーションフィルタ

---

### 4. MatchRequests（マッチングリクエスト）

**説明**: ユーザー間のマッチングリクエストを管理

#### スキーマ

```json
{
  "request_id": "string (UUID)",        // PK
  "from_user_id": "string",             // FK: Users（送信者）
  "to_user_id": "string",               // FK: Users（受信者）
  "match_id": "string",                 // FK: Matches
  "status": "string",                   // pending, approved, rejected
  "created_at": "string (ISO 8601)",
  "responded_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

#### インデックス

- **Primary Key**: `request_id` (HASH)
- **GSI-1**: `from_user_id` (HASH) + `created_at` (RANGE) - 送信したリクエスト
- **GSI-2**: `to_user_id` (HASH) + `status` (RANGE) - 受信したリクエスト

#### アクセスパターン

- 送信したリクエスト一覧: `Query(GSI-1, from_user_id)`
- 受信したリクエスト一覧: `Query(GSI-2, to_user_id)`

---

### 5. Conversations（会話）

**説明**: チャット会話を管理（グループチャット対応）

#### スキーマ

```json
{
  "conversation_id": "string (UUID)",   // PK
  "match_id": "string",                 // FK: Matches
  "conversation_type": "string",        // direct, group
  "last_message_at": "string (ISO 8601)",
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

#### インデックス

- **Primary Key**: `conversation_id` (HASH)
- **GSI-1**: `match_id` (HASH) + `created_at` (RANGE) - 試合ごとの会話

---

### 6. ConversationParticipants（会話参加者）

**説明**: 会話の参加者を管理（多対多リレーション）

#### スキーマ

```json
{
  "participant_id": "string (UUID)",    // PK
  "conversation_id": "string",          // FK: Conversations
  "user_id": "string",                  // FK: Users
  "joined_at": "string (ISO 8601)",
  "last_read_at": "string (ISO 8601)",  // 未読計算用
  "created_at": "string (ISO 8601)"
}
```

#### インデックス

- **Primary Key**: `participant_id` (HASH)
- **GSI-1**: `conversation_id` (HASH) - 会話の参加者一覧
- **GSI-2**: `user_id` (HASH) + `last_read_at` (RANGE) - ユーザーの会話一覧

---

### 7. Messages（メッセージ）

**説明**: チャットメッセージを管理

#### スキーマ

```json
{
  "message_id": "string (UUID)",        // PK
  "conversation_id": "string",          // FK: Conversations
  "sender_id": "string",                // FK: Users
  "text": "string",                     // メッセージ本文
  "is_read": "boolean",                 // 既読フラグ
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

#### インデックス

- **Primary Key**: `message_id` (HASH)
- **GSI-1**: `conversation_id` (HASH) + `created_at` (RANGE) - 会話のメッセージ履歴

---

### 8. CheckIns（チェックイン）

**説明**: スタジアム到着のチェックイン記録

#### スキーマ

```json
{
  "check_in_id": "string (UUID)",       // PK
  "user_id": "string",                  // FK: Users
  "match_id": "string",                 // FK: Matches
  "checked_in_at": "string (ISO 8601)",
  "created_at": "string (ISO 8601)"
}
```

#### インデックス

- **Primary Key**: `check_in_id` (HASH)
- **GSI-1**: `user_id` (HASH) + `checked_in_at` (RANGE) - ユーザーのチェックイン履歴
- **GSI-2**: `match_id` (HASH) + `checked_in_at` (RANGE) - 試合ごとのチェックイン一覧

---

### 9. Reviews（レビュー・評価）

**説明**: 試合後のユーザー評価を管理

#### スキーマ

```json
{
  "review_id": "string (UUID)",         // PK
  "from_user_id": "string",             // FK: Users（評価者）
  "to_user_id": "string",               // FK: Users（被評価者）
  "match_id": "string",                 // FK: Matches
  "rating": "number (1-5)",             // 星評価
  "message": "string",                  // 感謝メッセージ
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

#### インデックス

- **Primary Key**: `review_id` (HASH)
- **GSI-1**: `from_user_id` (HASH) + `created_at` (RANGE) - 送信したレビュー
- **GSI-2**: `to_user_id` (HASH) + `created_at` (RANGE) - 受信したレビュー

---

### 10. Restaurants（店舗情報）

**説明**: 会場近くの居酒屋・レストラン情報を管理

#### スキーマ

```json
{
  "restaurant_id": "string (UUID)",     // PK
  "venue": "string",                    // 会場名（ミクニワールドスタジアム北九州など）
  "name": "string",                     // 店舗名
  "address": "string",                  // 住所
  "latitude": "number",                 // 緯度
  "longitude": "number",                // 経度
  "category": "string",                 // izakaya, cafe, ramen, other
  "image_url": "string",                // 店舗画像URL
  "google_map_url": "string",           // GoogleMapリンク
  "distance": "number",                 // 会場からの距離（メートル）
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

#### インデックス

- **Primary Key**: `restaurant_id` (HASH)
- **GSI-1**: `venue` (HASH) + `distance` (RANGE) - 会場別に距離順で取得
- **GSI-2**: `venue` (HASH) + `name` (RANGE) - 会場別に店舗名で検索

#### アクセスパターン

- 店舗IDで取得: `GetItem(restaurant_id)`
- 会場近くの店舗を距離順で取得: `Query(GSI-1, venue="ミクニワールドスタジアム北九州")`
- 店舗名で検索: `Query(GSI-2, venue + name)`

---

### 11. PostMatchChats（試合後チャット）

**説明**: 試合後のギラ飲みチャットを管理

#### スキーマ

```json
{
  "chat_id": "string (UUID)",           // PK
  "match_id": "string",                 // FK: Matches
  "start_time": "string (ISO 8601)",    // チャット開始時刻（試合終了時刻）
  "end_time": "string (ISO 8601)",      // チャット終了時刻（23:59）
  "is_closed": "boolean",               // 閉鎖フラグ
  "participant_count": "number",        // 参加者数
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

#### インデックス

- **Primary Key**: `chat_id` (HASH)
- **GSI-1**: `match_id` (HASH) - 試合IDでチャット取得

#### アクセスパターン

- チャットIDで取得: `GetItem(chat_id)`
- 試合IDからチャット取得: `Query(GSI-1, match_id)`

---

### 12. PostMatchChatMessages（チャットメッセージ）

**説明**: ギラ飲みチャットのメッセージを管理

#### スキーマ

```json
{
  "message_id": "string (UUID)",        // PK
  "chat_id": "string",                  // FK: PostMatchChats
  "user_id": "string",                  // FK: Users（送信者）
  "text": "string",                     // メッセージ本文
  "restaurant_id": "string",            // FK: Restaurants（付与された店舗、任意）
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)",
  "is_deleted": "boolean"               // 削除フラグ
}
```

#### インデックス

- **Primary Key**: `message_id` (HASH)
- **GSI-1**: `chat_id` (HASH) + `created_at` (RANGE) - チャットのメッセージ履歴
- **GSI-2**: `user_id` (HASH) + `created_at` (RANGE) - ユーザーの投稿履歴

#### アクセスパターン

- メッセージIDで取得: `GetItem(message_id)`
- チャットのメッセージ履歴: `Query(GSI-1, chat_id)`
- ユーザーの投稿履歴: `Query(GSI-2, user_id)`

---

### 13. RestaurantShares（店舗共有履歴）

**説明**: チャット内での店舗共有状況を管理（Map表示用）

#### スキーマ

```json
{
  "share_id": "string (UUID)",          // PK
  "chat_id": "string",                  // FK: PostMatchChats
  "restaurant_id": "string",            // FK: Restaurants
  "message_id": "string",               // FK: PostMatchChatMessages
  "user_id": "string",                  // FK: Users（共有者）
  "created_at": "string (ISO 8601)"
}
```

#### インデックス

- **Primary Key**: `share_id` (HASH)
- **GSI-1**: `chat_id` (HASH) + `restaurant_id` (RANGE) - チャット別の店舗共有状況
- **GSI-2**: `restaurant_id` (HASH) + `created_at` (RANGE) - 店舗別の共有履歴

#### アクセスパターン

- 共有IDで取得: `GetItem(share_id)`
- チャット内の店舗共有状況（Map表示用）: `Query(GSI-1, chat_id)` + 集計処理
- 店舗の共有履歴: `Query(GSI-2, restaurant_id)`

---

## エンティティ関係図（ER図）

```
User (1) ──< UserMatch >── (M) Match
  │
  ├──< MatchRequest (from) >── Match
  ├──< MatchRequest (to) >── Match
  │
  ├──< ConversationParticipant >── Conversation ──< Message
  │                                     │
  │                                     └── Match
  ├──< CheckIn >── Match
  │
  ├──< Review (from/to) >── Match
  │
  └──< PostMatchChatMessages >── PostMatchChat ──< Match
           │                          │
           │                          └── RestaurantShares ──< Restaurant
           │
           └── Restaurant (optional)

Restaurant ──< RestaurantShares
```

---

## 主要なクエリパターン

### 1. マッチング候補の検索

```javascript
// 特定試合で、観戦スタイルと席の好みが合うユーザーを検索
const params = {
  TableName: 'UserMatches',
  IndexName: 'MatchIdIndex',
  KeyConditionExpression: 'match_id = :matchId',
  FilterExpression: 'viewing_style = :style AND seat_preference = :seat AND participation_mode <> :myMode AND #status = :active',
  ExpressionAttributeNames: {
    '#status': 'status'
  },
  ExpressionAttributeValues: {
    ':matchId': matchId,
    ':style': viewingStyle,
    ':seat': seatPreference,
    ':myMode': myParticipationMode,
    ':active': 'active'
  }
};
```

### 2. 未読メッセージ数の取得

```javascript
// ユーザーの未読メッセージ数を計算
const params = {
  TableName: 'Messages',
  IndexName: 'ConversationIdIndex',
  KeyConditionExpression: 'conversation_id = :convId',
  FilterExpression: 'sender_id <> :myUserId AND is_read = :false',
  ExpressionAttributeValues: {
    ':convId': conversationId,
    ':myUserId': myUserId,
    ':false': false
  },
  Select: 'COUNT'
};
```

### 3. 信頼スコアの更新

```javascript
// ユーザーの平均評価を計算して信頼スコアを更新
const reviews = await queryReviewsByToUserId(userId);
const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

await updateUser(userId, { trust_score: avgRating });
```

---

## データ整合性の保証

### DynamoDBの制約

DynamoDBは外部キー制約をサポートしていないため、アプリケーションレベルで整合性を保証する必要があります。

### 実装方針

1. **トランザクション API の活用**
   - 複数テーブルへの書き込みは TransactWriteItems を使用
   - 例: MatchRequest承認時に Conversation も同時作成

2. **バリデーション**
   - 外部キー参照先の存在確認を実装
   - 例: UserMatch作成時に user_id と match_id の存在確認

3. **カスケード削除**
   - ビジネスロジックで実装
   - 例: Match削除時に関連する UserMatch, MatchRequest も削除

---

## パフォーマンス最適化

### 1. BatchGetItem の活用

複数アイテムを一度に取得：

```javascript
const params = {
  RequestItems: {
    'Users': {
      Keys: userIds.map(id => ({ user_id: id }))
    }
  }
};
await docClient.batchGet(params);
```

### 2. Pagination

大量データの取得時は LastEvaluatedKey を使用：

```javascript
let lastKey = null;
const allItems = [];

do {
  const params = {
    TableName: 'Messages',
    IndexName: 'ConversationIdIndex',
    KeyConditionExpression: 'conversation_id = :convId',
    ExpressionAttributeValues: { ':convId': conversationId },
    ExclusiveStartKey: lastKey,
    Limit: 50
  };

  const result = await docClient.query(params);
  allItems.push(...result.Items);
  lastKey = result.LastEvaluatedKey;
} while (lastKey);
```

### 3. 条件付き書き込み

重複防止のための条件付きPutItem：

```javascript
const params = {
  TableName: 'CheckIns',
  Item: checkInData,
  ConditionExpression: 'attribute_not_exists(check_in_id)'
};
```

---

## コスト最適化

### 1. PAY_PER_REQUEST vs PROVISIONED

- **開発・小規模**: PAY_PER_REQUEST（使った分だけ課金）
- **本番・大規模**: PROVISIONED（予測可能なトラフィック時）

### 2. GSIの最小化

- 必要最小限のGSIのみ作成
- ProjectionTypeは必要に応じてALL/KEYS_ONLY/INCLUDEを選択

### 3. TTL（Time To Live）の活用

古いメッセージやログを自動削除：

```javascript
{
  "message_id": "...",
  "text": "...",
  "ttl": 1735689600  // Unix timestamp (自動削除される日時)
}
```

---

## セキュリティ

### 1. IAMロールの最小権限

```yaml
# serverless.yml
provider:
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:Query
            - dynamodb:UpdateItem
          Resource:
            - arn:aws:dynamodb:*:*:table/Users
            - arn:aws:dynamodb:*:*:table/Users/index/*
```

### 2. 暗号化

- **保存時暗号化**: AWS KMS（デフォルトで有効）
- **転送時暗号化**: HTTPS通信

### 3. アクセス制御

- APIレベルでユーザー認証を実装
- ユーザーは自分のデータのみアクセス可能

---

## バックアップ戦略

### 1. Point-in-Time Recovery (PITR)

```yaml
# serverless.yml
resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        PointInTimeRecoverySpecification:
          PointInTimeRecoveryEnabled: true
```

### 2. オンデマンドバックアップ

定期的なスナップショット取得を推奨

---

## モニタリング

### CloudWatch メトリクス

- **ReadCapacityUnits**: 読み込みキャパシティ
- **WriteCapacityUnits**: 書き込みキャパシティ
- **UserErrors**: クライアントエラー数
- **SystemErrors**: サーバーエラー数

### アラート設定例

```yaml
# CloudWatch Alarm
ThrottledRequestsAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    MetricName: UserErrors
    Threshold: 10
    ComparisonOperator: GreaterThanThreshold
```

---

## マイグレーション戦略

### 将来的なスケール時

1. **Single Table Design への移行**
   - 現在: Multi-Table Design（開発初期向け）
   - 将来: Single Table Design（大規模トラフィック対応）

2. **DynamoDB Streams の活用**
   - リアルタイム通知機能
   - データ同期・レプリケーション

3. **ElastiCache の追加**
   - 頻繁にアクセスされるデータのキャッシュ
   - API応答速度の向上

---

## 参考資料

- [AWS DynamoDB ドキュメント](https://docs.aws.amazon.com/dynamodb/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-10-22 | 1.0.0 | 初版作成 |
| 2025-10-25 | 1.1.0 | ギラ飲み機能用テーブル追加（Restaurants, PostMatchChats, PostMatchChatMessages, RestaurantShares） |
