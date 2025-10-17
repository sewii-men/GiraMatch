// hakkutsu-api/handler.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");

const app = express();

/**
 * ✅ CORS設定（Serverless v4と整合性あり）
 * - 本番
 * - 開発プレビュー
 * - ローカル開発
 */
const allowedOrigins = [
  "https://hakkutsu-8u8105n1c-tai09to06y-3264s-projects.vercel.app", // 本番
  "https://hakkutsu-git-develop-tai09to06y-3264s-projects.vercel.app", // develop
  "http://localhost:3000", // ローカル
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ Blocked by CORS policy: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// JSONボディを扱う
app.use(express.json());

/**
 * ✅ DynamoDB設定
 */
const USERS_TABLE = process.env.USERS_TABLE;
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

/**
 * ✅ 動作確認用エンドポイント
 */
app.get("/", (req, res) => {
  res.json({ message: "Hello from Express on AWS Lambda with CORS!" });
});

/**
 * ✅ ユーザー取得
 */
app.get("/users/:userId", async (req, res) => {
  const params = { TableName: USERS_TABLE, Key: { userId: req.params.userId } };
  try {
    const { Item } = await docClient.send(new GetCommand(params));
    if (Item) res.json(Item);
    else res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.error("❌ DynamoDB Get Error:", error);
    res.status(500).json({ error: "Could not retrieve user" });
  }
});

/**
 * ✅ ユーザー登録
 */
app.post("/users", async (req, res) => {
  const { userId, name } = req.body;
  if (!userId || !name)
    return res.status(400).json({ error: "userId and name are required" });

  try {
    await docClient.send(
      new PutCommand({ TableName: USERS_TABLE, Item: { userId, name } })
    );
    res.json({ userId, name });
  } catch (error) {
    console.error("❌ DynamoDB Put Error:", error);
    res.status(500).json({ error: "Could not create user" });
  }
});

/**
 * ✅ 404ハンドリング
 */
app.use((req, res) => res.status(404).json({ error: "Not Found" }));

exports.handler = serverless(app);
module.exports.app = app; // for local dev (Dockerなど)
