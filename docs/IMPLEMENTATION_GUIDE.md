# データベース実装ガイド

## 概要

このガイドでは、Giraventアプリケーションのデータベース（DynamoDB）を実装する手順を段階的に説明します。

## 前提条件

### 必要なツール

- Node.js 20.x 以上
- Docker & Docker Compose
- AWS CLI（本番デプロイ時）
- Serverless Framework

### 必要な知識

- JavaScript/TypeScript の基礎
- AWS DynamoDB の基本概念
- REST API の基礎

---

## 実装手順

## フェーズ1: ローカル開発環境のセットアップ

### Step 1: アクセスパターンの定義

データベース設計の前に、アプリケーションが必要とするクエリパターンを明確にします。

#### 主要なアクセスパターン

```javascript
// 1. ユーザー関連
- getUserById(userId)
- getUserByPhone(phoneNumber)

// 2. 試合関連
- getAllMatches()
- getMatchById(matchId)
- getUpcomingMatches()

// 3. 試合参加関連
- getUserMatches(userId)
- getMatchParticipants(matchId)
- getMatchingCandidates(matchId, viewingStyle, seatPreference)

// 4. マッチング関連
- getSentRequests(userId)
- getReceivedRequests(userId)
- approveRequest(requestId)

// 5. チャット関連
- getUserConversations(userId)
- getConversationMessages(conversationId)
- getUnreadMessageCount(conversationId, userId)

// 6. チェックイン関連
- checkIn(userId, matchId)
- getMatchCheckIns(matchId)

// 7. レビュー関連
- createReview(fromUserId, toUserId, matchId, rating)
- getUserReviews(userId)
```

### Step 2: ローカルDynamoDBの起動

既存のDocker Composeを使用してDynamoDB Localを起動します。

```bash
# プロジェクトルートで実行
cd /Users/name/Documents/GitHub/hakkutsu-app

# DynamoDBとAPIサーバーを起動
docker-compose up -d

# 起動確認
docker ps
```

**確認ポイント:**
- DynamoDB Local: `http://localhost:8000`
- APIサーバー: `http://localhost:4000`

### Step 3: テーブル作成スクリプトの作成

ローカル開発環境用のテーブル作成スクリプトを実装します。

#### 3-1. スクリプトディレクトリの作成

```bash
cd hakkutsu-api
mkdir -p scripts
```

#### 3-2. テーブル作成スクリプトの実装

**ファイル**: `hakkutsu-api/scripts/create-tables.js`

```javascript
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { CreateTableCommand, ListTablesCommand } = require("@aws-sdk/client-dynamodb");

// ローカルDynamoDB接続設定
const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "ap-northeast-1",
  credentials: {
    accessKeyId: "dummy",
    secretAccessKey: "dummy"
  }
});

// テーブル定義
const tables = [
  {
    TableName: "Users",
    KeySchema: [
      { AttributeName: "user_id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "user_id", AttributeType: "S" },
      { AttributeName: "phone_number", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "PhoneNumberIndex",
        KeySchema: [
          { AttributeName: "phone_number", KeyType: "HASH" }
        ],
        Projection: { ProjectionType: "ALL" }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "Matches",
    KeySchema: [
      { AttributeName: "match_id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "match_id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "match_date", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "StatusDateIndex",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
          { AttributeName: "match_date", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "UserMatches",
    KeySchema: [
      { AttributeName: "user_match_id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "user_match_id", AttributeType: "S" },
      { AttributeName: "user_id", AttributeType: "S" },
      { AttributeName: "match_id", AttributeType: "S" },
      { AttributeName: "created_at", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserIdIndex",
        KeySchema: [
          { AttributeName: "user_id", KeyType: "HASH" },
          { AttributeName: "created_at", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" }
      },
      {
        IndexName: "MatchIdIndex",
        KeySchema: [
          { AttributeName: "match_id", KeyType: "HASH" }
        ],
        Projection: { ProjectionType: "ALL" }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "MatchRequests",
    KeySchema: [
      { AttributeName: "request_id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "request_id", AttributeType: "S" },
      { AttributeName: "from_user_id", AttributeType: "S" },
      { AttributeName: "to_user_id", AttributeType: "S" },
      { AttributeName: "created_at", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "FromUserIdIndex",
        KeySchema: [
          { AttributeName: "from_user_id", KeyType: "HASH" },
          { AttributeName: "created_at", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" }
      },
      {
        IndexName: "ToUserIdIndex",
        KeySchema: [
          { AttributeName: "to_user_id", KeyType: "HASH" },
          { AttributeName: "created_at", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "Conversations",
    KeySchema: [
      { AttributeName: "conversation_id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "conversation_id", AttributeType: "S" },
      { AttributeName: "match_id", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "MatchIdIndex",
        KeySchema: [
          { AttributeName: "match_id", KeyType: "HASH" }
        ],
        Projection: { ProjectionType: "ALL" }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "ConversationParticipants",
    KeySchema: [
      { AttributeName: "participant_id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "participant_id", AttributeType: "S" },
      { AttributeName: "conversation_id", AttributeType: "S" },
      { AttributeName: "user_id", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "ConversationIdIndex",
        KeySchema: [
          { AttributeName: "conversation_id", KeyType: "HASH" }
        ],
        Projection: { ProjectionType: "ALL" }
      },
      {
        IndexName: "UserIdIndex",
        KeySchema: [
          { AttributeName: "user_id", KeyType: "HASH" }
        ],
        Projection: { ProjectionType: "ALL" }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "Messages",
    KeySchema: [
      { AttributeName: "message_id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "message_id", AttributeType: "S" },
      { AttributeName: "conversation_id", AttributeType: "S" },
      { AttributeName: "created_at", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "ConversationIdIndex",
        KeySchema: [
          { AttributeName: "conversation_id", KeyType: "HASH" },
          { AttributeName: "created_at", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "CheckIns",
    KeySchema: [
      { AttributeName: "check_in_id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "check_in_id", AttributeType: "S" },
      { AttributeName: "user_id", AttributeType: "S" },
      { AttributeName: "match_id", AttributeType: "S" },
      { AttributeName: "checked_in_at", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserIdIndex",
        KeySchema: [
          { AttributeName: "user_id", KeyType: "HASH" },
          { AttributeName: "checked_in_at", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" }
      },
      {
        IndexName: "MatchIdIndex",
        KeySchema: [
          { AttributeName: "match_id", KeyType: "HASH" },
          { AttributeName: "checked_in_at", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  },
  {
    TableName: "Reviews",
    KeySchema: [
      { AttributeName: "review_id", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
      { AttributeName: "review_id", AttributeType: "S" },
      { AttributeName: "from_user_id", AttributeType: "S" },
      { AttributeName: "to_user_id", AttributeType: "S" },
      { AttributeName: "created_at", AttributeType: "S" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "FromUserIdIndex",
        KeySchema: [
          { AttributeName: "from_user_id", KeyType: "HASH" },
          { AttributeName: "created_at", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" }
      },
      {
        IndexName: "ToUserIdIndex",
        KeySchema: [
          { AttributeName: "to_user_id", KeyType: "HASH" },
          { AttributeName: "created_at", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" }
      }
    ],
    BillingMode: "PAY_PER_REQUEST"
  }
];

async function createTables() {
  console.log("🚀 テーブル作成を開始します...\n");

  // 既存のテーブル一覧を取得
  const listResult = await client.send(new ListTablesCommand({}));
  const existingTables = listResult.TableNames || [];

  for (const tableConfig of tables) {
    const tableName = tableConfig.TableName;

    if (existingTables.includes(tableName)) {
      console.log(`⏭️  ${tableName} は既に存在します（スキップ）`);
      continue;
    }

    try {
      await client.send(new CreateTableCommand(tableConfig));
      console.log(`✅ ${tableName} を作成しました`);
    } catch (error) {
      console.error(`❌ ${tableName} の作成に失敗:`, error.message);
    }
  }

  console.log("\n🎉 テーブル作成が完了しました！");
}

createTables().catch(console.error);
```

#### 3-3. package.jsonにスクリプトを追加

**ファイル**: `hakkutsu-api/package.json`

```json
{
  "name": "hakkutsu-api",
  "version": "1.0.0",
  "description": "",
  "scripts": {
    "create-tables": "node scripts/create-tables.js"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.585.0",
    "@aws-sdk/lib-dynamodb": "^3.585.0",
    "express": "^4.21.2",
    "serverless-http": "^3.2.0"
  }
}
```

#### 3-4. テーブル作成の実行

```bash
cd hakkutsu-api
npm run create-tables
```

**期待される出力:**

```
🚀 テーブル作成を開始します...

✅ Users を作成しました
✅ Matches を作成しました
✅ UserMatches を作成しました
✅ MatchRequests を作成しました
✅ Conversations を作成しました
✅ ConversationParticipants を作成しました
✅ Messages を作成しました
✅ CheckIns を作成しました
✅ Reviews を作成しました

🎉 テーブル作成が完了しました！
```

### Step 4: API エンドポイントの実装

既存の`handler.js`を拡張して、全テーブルに対するCRUD操作を実装します。

#### 4-1. ディレクトリ構成の整理

```bash
hakkutsu-api/
├── handler.js           # メインハンドラー
├── routes/              # ルート定義（新規作成）
│   ├── users.js
│   ├── matches.js
│   ├── userMatches.js
│   ├── matchRequests.js
│   ├── conversations.js
│   ├── messages.js
│   ├── checkIns.js
│   └── reviews.js
├── models/              # データモデル（新規作成）
│   └── dynamodb.js
├── scripts/
│   └── create-tables.js
├── package.json
└── serverless.yml
```

#### 4-2. DynamoDBクライアントの共通化

**ファイル**: `hakkutsu-api/models/dynamodb.js`

```javascript
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

// 環境に応じてエンドポイントを切り替え
const config = process.env.IS_OFFLINE
  ? {
      endpoint: "http://localhost:8000",
      region: "ap-northeast-1",
      credentials: {
        accessKeyId: "dummy",
        secretAccessKey: "dummy"
      }
    }
  : {};

const client = new DynamoDBClient(config);
const docClient = DynamoDBDocumentClient.from(client);

module.exports = { docClient };
```

#### 4-3. サンプル: Matchesルートの実装

**ファイル**: `hakkutsu-api/routes/matches.js`

```javascript
const express = require("express");
const router = express.Router();
const { docClient } = require("../models/dynamodb");
const { GetCommand, PutCommand, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = "Matches";

// 全試合取得（upcoming のみ、日付順）
router.get("/", async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: "StatusDateIndex",
      KeyConditionExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": "upcoming"
      },
      ScanIndexForward: true // 昇順（古い順）
    };

    const result = await docClient.send(new QueryCommand(params));
    res.json(result.Items || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "試合一覧の取得に失敗しました" });
  }
});

// 試合詳細取得
router.get("/:matchId", async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { match_id: req.params.matchId }
    };

    const result = await docClient.send(new GetCommand(params));
    if (result.Item) {
      res.json(result.Item);
    } else {
      res.status(404).json({ error: "試合が見つかりません" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "試合の取得に失敗しました" });
  }
});

// 試合作成
router.post("/", async (req, res) => {
  try {
    const { match_date, opponent, venue, description } = req.body;

    if (!match_date || !opponent || !venue) {
      return res.status(400).json({ error: "必須項目が不足しています" });
    }

    const match = {
      match_id: uuidv4(),
      match_date,
      opponent,
      venue,
      description: description || "",
      status: "upcoming",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: match
    }));

    res.status(201).json(match);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "試合の作成に失敗しました" });
  }
});

module.exports = router;
```

#### 4-4. handler.jsの更新

**ファイル**: `hakkutsu-api/handler.js`

```javascript
const express = require("express");
const serverless = require("serverless-http");

const app = express();

// Middleware
app.use(express.json());

// CORS設定
const allowedOrigins = [
  "https://hakkutsu-app-taiyoyamada-tai09to06y-3264s-projects.vercel.app",
  "http://localhost:3000"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// ルート
const usersRouter = require("./routes/users");
const matchesRouter = require("./routes/matches");
const userMatchesRouter = require("./routes/userMatches");
const matchRequestsRouter = require("./routes/matchRequests");
const conversationsRouter = require("./routes/conversations");
const messagesRouter = require("./routes/messages");
const checkInsRouter = require("./routes/checkIns");
const reviewsRouter = require("./routes/reviews");

app.use("/users", usersRouter);
app.use("/matches", matchesRouter);
app.use("/user-matches", userMatchesRouter);
app.use("/match-requests", matchRequestsRouter);
app.use("/conversations", conversationsRouter);
app.use("/messages", messagesRouter);
app.use("/check-ins", checkInsRouter);
app.use("/reviews", reviewsRouter);

// ヘルスチェック
app.get("/", (req, res) => {
  res.json({ message: "Giravent API is running!" });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

exports.handler = serverless(app);
module.exports.app = app;
```

#### 4-5. uuid パッケージのインストール

```bash
cd hakkutsu-api
npm install uuid
```

### Step 5: ローカル環境でのテスト

#### 5-1. APIサーバーの起動確認

```bash
docker-compose up
```

#### 5-2. curlでテスト

**試合作成:**

```bash
curl -X POST http://localhost:4000/matches \
  -H "Content-Type: application/json" \
  -d '{
    "match_date": "2025-11-01T14:00:00Z",
    "opponent": "ロアッソ熊本",
    "venue": "ミクニワールドスタジアム北九州",
    "description": "J2リーグ 第38節"
  }'
```

**試合一覧取得:**

```bash
curl http://localhost:4000/matches
```

**試合詳細取得:**

```bash
curl http://localhost:4000/matches/{match_id}
```

#### 5-3. Postmanを使った総合テスト

1. Postmanをインストール
2. コレクションを作成
3. 各エンドポイントをテスト

---

## フェーズ2: フロントエンドとの統合

### Step 6: APIクライアントの実装

**ファイル**: `hakkutsu-front/src/lib/api.ts`

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function getMatches() {
  const res = await fetch(`${API_BASE_URL}/matches`);
  if (!res.ok) throw new Error("Failed to fetch matches");
  return res.json();
}

export async function getMatchById(matchId: string) {
  const res = await fetch(`${API_BASE_URL}/matches/${matchId}`);
  if (!res.ok) throw new Error("Failed to fetch match");
  return res.json();
}

export async function createMatch(data: {
  match_date: string;
  opponent: string;
  venue: string;
  description?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to create match");
  return res.json();
}

// 他のAPIメソッドも同様に実装
```

### Step 7: フロントエンドページの更新

**ファイル**: `hakkutsu-front/src/app/matches/page.tsx`

```typescript
import { getMatches } from "@/lib/api";

export default async function MatchesPage() {
  const matches = await getMatches();

  return (
    <div>
      <h1>試合一覧</h1>
      {matches.map((match) => (
        <div key={match.match_id}>
          <h2>{match.opponent}</h2>
          <p>{new Date(match.match_date).toLocaleDateString("ja-JP")}</p>
          <p>{match.venue}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## フェーズ3: 本番環境へのデプロイ

### Step 8: serverless.ymlの更新

**ファイル**: `hakkutsu-api/serverless.yml`

全テーブル定義を追加：

```yaml
resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:service}-users-${sls:stage}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: user_id
            AttributeType: S
          - AttributeName: phone_number
            AttributeType: S
        KeySchema:
          - AttributeName: user_id
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: PhoneNumberIndex
            KeySchema:
              - AttributeName: phone_number
                KeyType: HASH
            Projection:
              ProjectionType: ALL

    MatchesTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:service}-matches-${sls:stage}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: match_id
            AttributeType: S
          - AttributeName: status
            AttributeType: S
          - AttributeName: match_date
            AttributeType: S
        KeySchema:
          - AttributeName: match_id
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: StatusDateIndex
            KeySchema:
              - AttributeName: status
                KeyType: HASH
              - AttributeName: match_date
                KeyType: RANGE
            Projection:
              ProjectionType: ALL

    # 他のテーブルも同様に定義...
```

### Step 9: AWSへのデプロイ

```bash
cd hakkutsu-api

# devステージにデプロイ
serverless deploy --stage dev

# 本番環境にデプロイ
serverless deploy --stage prod
```

### Step 10: Vercelの環境変数設定

Vercelダッシュボードで環境変数を設定：

```
NEXT_PUBLIC_API_URL=https://xxxxx.execute-api.ap-northeast-1.amazonaws.com
```

---

## トラブルシューティング

### 問題1: DynamoDBに接続できない

**症状**: `ResourceNotFoundException`

**解決策**:
1. DynamoDB Localが起動しているか確認
   ```bash
   docker ps | grep dynamodb
   ```
2. エンドポイントURLが正しいか確認
   ```javascript
   endpoint: "http://localhost:8000"
   ```

### 問題2: テーブル作成時のエラー

**症状**: `ValidationException: One or more parameter values were invalid`

**解決策**:
- AttributeDefinitionsには、KeySchemaまたはGSIで使用する属性のみ定義
- 通常の属性（例: name, bio）は定義不要

### 問題3: CORS エラー

**症状**: ブラウザコンソールに `Access-Control-Allow-Origin` エラー

**解決策**:
1. serverless.ymlのCORS設定を確認
2. handler.jsのCORSミドルウェアを確認
3. フロントエンドのオリジンが許可リストに含まれているか確認

---

## パフォーマンス最適化

### 1. インデックスの最適化

- 頻繁にクエリする属性にGSIを設定
- ProjectionTypeは必要最小限に（KEYS_ONLY or INCLUDE）

### 2. BatchGetItemの活用

複数アイテムを一度に取得：

```javascript
const { BatchGetCommand } = require("@aws-sdk/lib-dynamodb");

const params = {
  RequestItems: {
    Users: {
      Keys: userIds.map(id => ({ user_id: id }))
    }
  }
};

const result = await docClient.send(new BatchGetCommand(params));
```

### 3. キャッシング戦略

- API Gatewayのキャッシング機能を有効化
- Redis/ElastiCacheの導入検討

---

## セキュリティベストプラクティス

### 1. IAMポリシーの最小権限化

```yaml
provider:
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:Query
          Resource:
            - arn:aws:dynamodb:*:*:table/${self:service}-*
```

### 2. 入力バリデーション

すべてのエンドポイントでバリデーションを実装：

```javascript
if (!userId || !name) {
  return res.status(400).json({ error: "必須項目が不足しています" });
}
```

### 3. レート制限

API Gatewayのスロットリング設定：

```yaml
provider:
  apiGateway:
    throttle:
      burstLimit: 200
      rateLimit: 100
```

---

## モニタリング

### CloudWatch Logs

Lambda関数のログを確認：

```bash
serverless logs -f api --tail
```

### CloudWatch Metrics

DynamoDBのメトリクスを監視：
- ReadCapacityUnits
- WriteCapacityUnits
- ThrottledRequests

---

## 次のステップ

1. 認証機能の実装（AWS Cognito）
2. リアルタイム通知（WebSocket / DynamoDB Streams）
3. 画像アップロード機能（S3）
4. 全文検索機能（OpenSearch）
5. 負荷テスト（Apache JMeter）

---

## 参考資料

- [Serverless Framework ドキュメント](https://www.serverless.com/framework/docs)
- [AWS DynamoDB ベストプラクティス](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Express.js ガイド](https://expressjs.com/ja/guide/routing.html)

---

## サポート

質問や問題がある場合は、以下を確認してください：

1. このドキュメント
2. `docs/DATABASE_DESIGN.md`
3. プロジェクトのREADME

---

**更新日**: 2025-10-22
