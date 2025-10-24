// hakkutsu-api/handler.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// CORS設定
const allowedOrigins = [
  "https://hakkutsu-1tmea49bc-tai09to06y-3264s-projects.vercel.app",
  "http://localhost:3000",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

const USERS_TABLE = process.env.USERS_TABLE;
const MATCHES_TABLE = process.env.MATCHES_TABLE;
const CHATS_TABLE = process.env.CHATS_TABLE;
const MESSAGES_TABLE = process.env.MESSAGES_TABLE;
const CHECKINS_TABLE = process.env.CHECKINS_TABLE;
const REVIEWS_TABLE = process.env.REVIEWS_TABLE;

// Local DynamoDB (via docker-compose) support
const isLocal = !!process.env.DYNAMODB_LOCAL_URL;
const client = new DynamoDBClient(
  isLocal
    ? {
        endpoint: process.env.DYNAMODB_LOCAL_URL,
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy",
        },
      }
    : {}
);
const docClient = DynamoDBDocumentClient.from(client);

// 入力バリデーション
function validateUserId(userId) {
  if (typeof userId !== "string") return "userId は文字列で指定してください";
  const v = userId.trim();
  if (v.length < 3 || v.length > 30) return "userId は3〜30文字で入力してください";
  if (!/^[a-zA-Z0-9_-]+$/.test(v)) return "userId は英数字・_・- のみ利用できます";
  return null;
}
function validateDisplayName(name) {
  if (typeof name !== "string") return "表示名は文字列で指定してください";
  const v = name.trim();
  if (v.length < 1 || v.length > 50) return "表示名は1〜50文字で入力してください";
  return null;
}
function validatePassword(password) {
  if (typeof password !== "string") return "パスワードは文字列で指定してください";
  const v = password;
  if (v.length < 8 || v.length > 72) return "パスワードは8〜72文字で入力してください";
  if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) return "パスワードには英字と数字を含めてください";
  return null;
}

// 認証ミドルウェア
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
function requireAuth(req, res, next) {
  try {
    const h = req.headers["authorization"] || req.headers["Authorization"];
    if (!h || typeof h !== "string" || !h.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const token = h.slice("Bearer ".length).trim();
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // expects { sub, name }
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// 確認用エンドポイント
app.get("/", (req, res) => {
  res.json({ message: "Hello from Express on AWS Lambda with CORS!" });
});

// ========== Auth ==========

// 登録
app.post("/auth/register", async (req, res) => {
  const { userId, name, password } = req.body || {};
  if (!userId || !name || !password) return res.status(400).json({ error: "userId, name, password are required" });
  const idErr = validateUserId(userId);
  if (idErr) return res.status(400).json({ error: idErr });
  const nameErr = validateDisplayName(name);
  if (nameErr) return res.status(400).json({ error: nameErr });
  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  try {
    const exist = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId } }));
    if (exist.Item) return res.status(409).json({ error: "User already exists" });
    const passwordHash = await bcrypt.hash(password, 10);
    const item = { userId, name, passwordHash, createdAt: new Date().toISOString() };
    await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: item }));
    const token = jwt.sign({ sub: userId, name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { userId, name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not register" });
  }
});

// ログイン
app.post("/auth/login", async (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) return res.status(400).json({ error: "userId and password are required" });
  const idErr = validateUserId(userId);
  if (idErr) return res.status(400).json({ error: idErr });
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: "パスワードは8〜72文字で入力してください" });
  }
  try {
    const { Item } = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId } }));
    if (!Item || !Item.passwordHash) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, Item.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ sub: userId, name: Item.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { userId, name: Item.name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not login" });
  }
});

// ========== Matching Candidates ==========
app.get("/matching/candidates", requireAuth, async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: USERS_TABLE }));
    const items = (data.Items || []).filter((u) => u.isCandidate);
    // Map to UI shape
    const mapped = items.map((u) => ({
      id: u.userId,
      nickname: u.nickname || u.name,
      icon: u.icon || "🙂",
      style: u.style || "",
      seat: u.seat || "",
      trustScore: u.trustScore || 0,
      matchRate: u.matchRate || 0,
      bio: u.bio || "",
    }));
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not list candidates" });
  }
});

// ========== Matches ==========
// 一覧
app.get("/matches", async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: MATCHES_TABLE }));
    const items = (data.Items || []).sort((a, b) => (a.matchId > b.matchId ? 1 : -1));
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not list matches" });
  }
});

// 詳細
app.get("/matches/:matchId", async (req, res) => {
  const params = { TableName: MATCHES_TABLE, Key: { matchId: req.params.matchId } };
  try {
    const { Item } = await docClient.send(new GetCommand(params));
    if (!Item) return res.status(404).json({ error: "Match not found" });
    res.json(Item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not get match" });
  }
});

// ========== Chats ==========
// チャット一覧（ユーザーIDでフィルター）
app.get("/chats", requireAuth, async (req, res) => {
  const userId = req.user?.sub;
  try {
    const data = await docClient.send(new ScanCommand({ TableName: CHATS_TABLE }));
    const items = (data.Items || []).filter((c) => Array.isArray(c.participants) && c.participants.includes(userId));
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not list chats" });
  }
});

// チャット詳細 + メッセージ一覧
app.get("/chats/:chatId", requireAuth, async (req, res) => {
  const chatId = req.params.chatId;
  try {
    const chatResp = await docClient.send(new GetCommand({ TableName: CHATS_TABLE, Key: { chatId } }));
    if (!chatResp.Item) return res.status(404).json({ error: "Chat not found" });
    const isMember = Array.isArray(chatResp.Item.participants) && chatResp.Item.participants.includes(req.user?.sub);
    if (!isMember) return res.status(403).json({ error: "Forbidden" });
    const msgResp = await docClient.send(
      new QueryCommand({
        TableName: MESSAGES_TABLE,
        KeyConditionExpression: "chatId = :c",
        ExpressionAttributeValues: { ":c": chatId },
        ScanIndexForward: true,
      })
    );
    res.json({ chat: chatResp.Item, messages: msgResp.Items || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not get chat" });
  }
});

// メッセージ送信
app.post("/chats/:chatId/messages", requireAuth, async (req, res) => {
  const chatId = req.params.chatId;
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: "text is required" });
  const sid = req.user?.sub;
  // ensure membership
  try {
    const chatResp = await docClient.send(new GetCommand({ TableName: CHATS_TABLE, Key: { chatId } }));
    if (!chatResp.Item) return res.status(404).json({ error: "Chat not found" });
    const isMember = Array.isArray(chatResp.Item.participants) && chatResp.Item.participants.includes(sid);
    if (!isMember) return res.status(403).json({ error: "Forbidden" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not verify chat membership" });
  }
  const messageId = Date.now().toString();
  const item = {
    chatId,
    messageId,
    text,
    senderId: sid,
    createdAt: new Date().toISOString(),
  };
  try {
    await docClient.send(new PutCommand({ TableName: MESSAGES_TABLE, Item: item }));
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not send message" });
  }
});

// ========== Check-ins ==========
// 来場チェック一覧（ユーザー別）
app.get("/check-ins", requireAuth, async (req, res) => {
  const userId = req.user?.sub;
  try {
    // 全試合
    const matchesResp = await docClient.send(new ScanCommand({ TableName: MATCHES_TABLE }));
    const matches = matchesResp.Items || [];
    // 参加チャット（=パートナー情報を持つ）
    const chatsResp = await docClient.send(new ScanCommand({ TableName: CHATS_TABLE }));
    const chats = (chatsResp.Items || []).filter((c) => Array.isArray(c.participants) && c.participants.includes(userId));
    // チェックイン状況
    const checkinsResp = await docClient.send(new ScanCommand({ TableName: CHECKINS_TABLE }));
    const checkins = checkinsResp.Items || [];

    const list = chats.map((chat) => {
      const match = matches.find((m) => m.matchId === chat.matchId) || {};
      const my = checkins.find((c) => c.matchId === chat.matchId && c.userId === userId);
      const partnerId = (chat.participants || []).find((p) => p !== userId);
      const partnerCheck = checkins.find((c) => c.matchId === chat.matchId && c.userId === partnerId);
      return {
        id: chat.matchId,
        date: match.date,
        time: match.time,
        opponent: match.opponent,
        venue: match.venue,
        partner: chat.partner,
        myCheckIn: !!(my && my.checkedIn),
        partnerCheckedIn: !!(partnerCheck && partnerCheck.checkedIn),
      };
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not list check-ins" });
  }
});

// 来場チェック登録
app.post("/check-ins", requireAuth, async (req, res) => {
  const { matchId, checkedIn } = req.body || {};
  if (!matchId) return res.status(400).json({ error: "matchId is required" });
  const uid = req.user?.sub;
  const item = { matchId, userId: uid, checkedIn: checkedIn ?? true };
  try {
    await docClient.send(new PutCommand({ TableName: CHECKINS_TABLE, Item: item }));
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not check-in" });
  }
});

// ========== Reviews ==========
app.post("/reviews", requireAuth, async (req, res) => {
  const { matchId, partnerId, rating, message } = req.body || {};
  if (!matchId || !partnerId || !rating) return res.status(400).json({ error: "matchId, partnerId, rating are required" });
  const reviewId = Date.now().toString();
  const item = {
    reviewId,
    matchId,
    partnerId,
    rating,
    message: message || "",
    userId: req.user?.sub,
    createdAt: new Date().toISOString(),
  };
  try {
    await docClient.send(new PutCommand({ TableName: REVIEWS_TABLE, Item: item }));
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not submit review" });
  }
});

// ユーザー取得
app.get("/users/:userId", async (req, res) => {
  const params = { TableName: USERS_TABLE, Key: { userId: req.params.userId } };
  try {
    const { Item } = await docClient.send(new GetCommand(params));
    if (Item) res.json(Item);
    else res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not retrieve user" });
  }
});

// ユーザー登録
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
    console.error(error);
    res.status(500).json({ error: "Could not create user" });
  }
});

app.use((req, res) => res.status(404).json({ error: "Not Found" }));

exports.handler = serverless(app);
module.exports.app = app; // local用にexport
