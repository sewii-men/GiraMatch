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

// CORS設定（ステージごとに環境変数から制御）
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
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
const REPORTS_TABLE = process.env.REPORTS_TABLE;

// Local DynamoDB (via docker-compose) support
const isLocal = !!process.env.DYNAMODB_LOCAL_URL;
const client = new DynamoDBClient(
  isLocal
    ? {
        endpoint: process.env.DYNAMODB_LOCAL_URL,
        region: process.env.AWS_REGION || "ap-northeast-1",
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

// 管理者認証ミドルウェア
function requireAdmin(req, res, next) {
  try {
    const h = req.headers["authorization"] || req.headers["Authorization"];
    if (!h || typeof h !== "string" || !h.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = h.slice("Bearer ".length).trim();
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;

    // ユーザーの管理者権限を非同期でチェック
    docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId: payload.sub } }))
      .then(({ Item }) => {
        if (!Item || !Item.isAdmin) {
          return res.status(403).json({ error: "Forbidden: Admin access required" });
        }
        return next();
      })
      .catch(() => {
        return res.status(500).json({ error: "Could not verify admin status" });
      });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// 確認用エンドポイント
app.get("/", (req, res) => {
  res.json({ message: "Hello from Express on AWS Lambda with CORS!" });
});

// ========== Auth ==========

// 管理者権限確認
app.get("/admin/verify", requireAdmin, (req, res) => {
  res.json({ isAdmin: true, userId: req.user?.sub });
});

// 統計データ取得
app.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    // 各テーブルのデータをスキャン
    const [usersData, matchesData, chatsData, checkinsData, reviewsData] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: USERS_TABLE })),
      docClient.send(new ScanCommand({ TableName: MATCHES_TABLE })),
      docClient.send(new ScanCommand({ TableName: CHATS_TABLE })),
      docClient.send(new ScanCommand({ TableName: CHECKINS_TABLE })),
      docClient.send(new ScanCommand({ TableName: REVIEWS_TABLE })),
    ]);

    const users = usersData.Items || [];
    const matches = matchesData.Items || [];
    const chats = chatsData.Items || [];
    const checkins = checkinsData.Items || [];
    const reviews = reviewsData.Items || [];

    // アクティブユーザー計算
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 簡易的な実装（実際にはlastActiveAtなどのフィールドが必要）
    const activeUsers = {
      daily: 0,
      weekly: 0,
      monthly: 0,
    };

    // 試合別統計
    const matchStats = matches.map((match) => {
      const matchChats = chats.filter((c) => c.matchId === match.matchId);
      const matchCheckins = checkins.filter((c) => c.matchId === match.matchId);
      return {
        matchId: match.matchId,
        opponent: match.opponent,
        date: match.date,
        chatCount: matchChats.length,
        checkinCount: matchCheckins.length,
      };
    }).sort((a, b) => b.chatCount - a.chatCount);

    res.json({
      totalUsers: users.length,
      totalMatches: matches.length,
      totalChats: chats.length,
      totalCheckIns: checkins.length,
      totalReviews: reviews.length,
      activeUsers,
      topMatches: matchStats.slice(0, 5),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch stats" });
  }
});

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
    const item = {
      userId,
      name,
      passwordHash,
      isAdmin: false,  // デフォルトは管理者権限なし
      createdAt: new Date().toISOString()
    };
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

// 管理者: 試合追加
app.post("/admin/matches", requireAdmin, async (req, res) => {
  const { matchId, opponent, date, time, venue, status } = req.body || {};
  if (!matchId || !opponent || !date || !time || !venue) {
    return res.status(400).json({ error: "matchId, opponent, date, time, venue are required" });
  }

  try {
    // 既存チェック
    const exist = await docClient.send(new GetCommand({ TableName: MATCHES_TABLE, Key: { matchId } }));
    if (exist.Item) return res.status(409).json({ error: "Match already exists" });

    const item = {
      matchId,
      opponent,
      date,
      time,
      venue,
      status: status || "scheduled",
      createdAt: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({ TableName: MATCHES_TABLE, Item: item }));
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create match" });
  }
});

// 管理者: 試合更新
app.put("/admin/matches/:matchId", requireAdmin, async (req, res) => {
  const matchId = req.params.matchId;
  const { opponent, date, time, venue, status } = req.body || {};

  try {
    const { Item } = await docClient.send(new GetCommand({ TableName: MATCHES_TABLE, Key: { matchId } }));
    if (!Item) return res.status(404).json({ error: "Match not found" });

    const updated = {
      ...Item,
      opponent: opponent !== undefined ? opponent : Item.opponent,
      date: date !== undefined ? date : Item.date,
      time: time !== undefined ? time : Item.time,
      venue: venue !== undefined ? venue : Item.venue,
      status: status !== undefined ? status : Item.status,
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({ TableName: MATCHES_TABLE, Item: updated }));
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update match" });
  }
});

// 管理者: 試合削除
app.delete("/admin/matches/:matchId", requireAdmin, async (req, res) => {
  const matchId = req.params.matchId;

  try {
    const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
    await docClient.send(new DeleteCommand({ TableName: MATCHES_TABLE, Key: { matchId } }));
    res.json({ message: "Match deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete match" });
  }
});

// 管理者: 試合別統計
app.get("/admin/matches/:matchId/stats", requireAdmin, async (req, res) => {
  const matchId = req.params.matchId;

  try {
    const [chatsData, checkinsData] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: CHATS_TABLE })),
      docClient.send(new ScanCommand({ TableName: CHECKINS_TABLE })),
    ]);

    const chats = (chatsData.Items || []).filter((c) => c.matchId === matchId);
    const checkins = (checkinsData.Items || []).filter((c) => c.matchId === matchId);

    res.json({
      chatCount: chats.length,
      checkinCount: checkins.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch match stats" });
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

// 管理者: 全チャット一覧取得
app.get("/admin/chats", requireAdmin, async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: CHATS_TABLE }));
    const chats = data.Items || [];
    res.json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not list chats" });
  }
});

// 管理者: メッセージ削除
app.delete("/admin/chats/:chatId/messages/:messageId", requireAdmin, async (req, res) => {
  const { chatId, messageId } = req.params;

  try {
    const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
    await docClient.send(
      new DeleteCommand({
        TableName: MESSAGES_TABLE,
        Key: { chatId, messageId },
      })
    );
    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete message" });
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

// ========== Admin: Check-ins ==========

// 管理者: 全チェックイン取得
app.get("/admin/check-ins", requireAdmin, async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: CHECKINS_TABLE }));
    const checkins = data.Items || [];

    // 試合情報とユーザー情報を取得
    const matchesData = await docClient.send(new ScanCommand({ TableName: MATCHES_TABLE }));
    const matches = matchesData.Items || [];

    const enriched = checkins.map((checkin) => {
      const match = matches.find((m) => m.matchId === checkin.matchId);
      return {
        ...checkin,
        matchInfo: match ? { opponent: match.opponent, date: match.date } : null,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not list check-ins" });
  }
});

// 管理者: 重複チェックイン検出
app.get("/admin/check-ins/duplicates", requireAdmin, async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: CHECKINS_TABLE }));
    const checkins = data.Items || [];

    // ユーザーごと、試合ごとにグループ化
    const grouped = checkins.reduce((acc, checkin) => {
      const key = `${checkin.userId}_${checkin.matchId}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(checkin);
      return acc;
    }, {});

    // 重複を検出（同じユーザー・試合で複数のチェックイン）
    const duplicates = Object.entries(grouped)
      .filter(([_, items]) => items.length > 1)
      .map(([key, items]) => ({
        userId: items[0].userId,
        matchId: items[0].matchId,
        count: items.length,
        checkins: items,
      }));

    res.json(duplicates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not detect duplicates" });
  }
});

// 管理者: チェックイン削除
app.delete("/admin/check-ins/:matchId/:userId", requireAdmin, async (req, res) => {
  const { matchId, userId } = req.params;

  try {
    const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
    await docClient.send(
      new DeleteCommand({
        TableName: CHECKINS_TABLE,
        Key: { matchId, userId },
      })
    );
    res.json({ message: "Check-in deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete check-in" });
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
    approved: false,
  };
  try {
    await docClient.send(new PutCommand({ TableName: REVIEWS_TABLE, Item: item }));
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not submit review" });
  }
});

// 管理者: 全レビュー取得
app.get("/admin/reviews", requireAdmin, async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: REVIEWS_TABLE }));
    const reviews = data.Items || [];

    // 日時順でソート（新しい順）
    reviews.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not list reviews" });
  }
});

// 管理者: レビュー承認
app.put("/admin/reviews/:reviewId/approve", requireAdmin, async (req, res) => {
  const reviewId = req.params.reviewId;

  try {
    const { Item } = await docClient.send(
      new GetCommand({ TableName: REVIEWS_TABLE, Key: { reviewId } })
    );

    if (!Item) return res.status(404).json({ error: "Review not found" });

    const updated = {
      ...Item,
      approved: true,
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({ TableName: REVIEWS_TABLE, Item: updated }));
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not approve review" });
  }
});

// 管理者: レビュー削除
app.delete("/admin/reviews/:reviewId", requireAdmin, async (req, res) => {
  const reviewId = req.params.reviewId;

  try {
    const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
    await docClient.send(new DeleteCommand({ TableName: REVIEWS_TABLE, Key: { reviewId } }));
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete review" });
  }
});

// 管理者: レビュー統計
app.get("/admin/reviews/stats", requireAdmin, async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: REVIEWS_TABLE }));
    const reviews = data.Items || [];

    const total = reviews.length;
    const approved = reviews.filter((r) => r.approved).length;
    const pending = total - approved;

    // 平均評価
    const avgRating = total > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total
      : 0;

    res.json({
      total,
      approved,
      pending,
      avgRating: Math.round(avgRating * 10) / 10,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch review stats" });
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

// ========== Admin: Reports ==========

// 管理者: 報告一覧取得
app.get("/admin/reports", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const data = await docClient.send(new ScanCommand({ TableName: REPORTS_TABLE }));
    let reports = data.Items || [];

    // ステータスフィルター
    if (status && typeof status === "string" && status !== "all") {
      reports = reports.filter((r) => r.status === status);
    }

    // 日時順でソート（新しい順）
    reports.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    res.json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not list reports" });
  }
});

// 管理者: 報告詳細取得
app.get("/admin/reports/:reportId", requireAdmin, async (req, res) => {
  const reportId = req.params.reportId;

  try {
    const { Item } = await docClient.send(
      new GetCommand({ TableName: REPORTS_TABLE, Key: { reportId } })
    );

    if (!Item) return res.status(404).json({ error: "Report not found" });

    // 報告者と被報告者の情報を取得
    const [reporterData, reportedData] = await Promise.all([
      docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId: Item.reporterId } })),
      docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId: Item.reportedUserId } })),
    ]);

    const reporter = reporterData.Item ? { userId: reporterData.Item.userId, name: reporterData.Item.name } : null;
    const reportedUser = reportedData.Item ? { userId: reportedData.Item.userId, name: reportedData.Item.name } : null;

    res.json({
      ...Item,
      reporter,
      reportedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not get report" });
  }
});

// 管理者: 報告対応・更新
app.put("/admin/reports/:reportId", requireAdmin, async (req, res) => {
  const reportId = req.params.reportId;
  const { status, actionTaken, notes } = req.body || {};

  try {
    const { Item } = await docClient.send(
      new GetCommand({ TableName: REPORTS_TABLE, Key: { reportId } })
    );

    if (!Item) return res.status(404).json({ error: "Report not found" });

    const updated = {
      ...Item,
      status: status !== undefined ? status : Item.status,
      actionTaken: actionTaken !== undefined ? actionTaken : Item.actionTaken,
      notes: notes !== undefined ? notes : Item.notes,
      updatedAt: new Date().toISOString(),
      handledBy: req.user?.sub,
    };

    await docClient.send(new PutCommand({ TableName: REPORTS_TABLE, Item: updated }));
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update report" });
  }
});

// 管理者: 報告対応アクション実行
app.post("/admin/reports/:reportId/actions", requireAdmin, async (req, res) => {
  const reportId = req.params.reportId;
  const { action, reason } = req.body || {}; // action: warn, suspend, delete, dismiss

  try {
    const { Item: report } = await docClient.send(
      new GetCommand({ TableName: REPORTS_TABLE, Key: { reportId } })
    );

    if (!report) return res.status(404).json({ error: "Report not found" });

    let actionTaken = "";
    let newStatus = report.status;

    // アクションに応じて被報告者のステータスを変更
    if (action === "warn") {
      actionTaken = "警告を送信しました";
      newStatus = "resolved";
    } else if (action === "suspend") {
      // ユーザーを停止
      const { Item: user } = await docClient.send(
        new GetCommand({ TableName: USERS_TABLE, Key: { userId: report.reportedUserId } })
      );
      if (user) {
        await docClient.send(
          new PutCommand({
            TableName: USERS_TABLE,
            Item: { ...user, suspended: true, updatedAt: new Date().toISOString() },
          })
        );
      }
      actionTaken = `アカウントを停止しました。理由: ${reason || "規約違反"}`;
      newStatus = "resolved";
    } else if (action === "delete") {
      // ユーザーを削除済みに
      const { Item: user } = await docClient.send(
        new GetCommand({ TableName: USERS_TABLE, Key: { userId: report.reportedUserId } })
      );
      if (user) {
        await docClient.send(
          new PutCommand({
            TableName: USERS_TABLE,
            Item: { ...user, deleted: true, updatedAt: new Date().toISOString() },
          })
        );
      }
      actionTaken = `アカウントを削除済みにしました。理由: ${reason || "重大な規約違反"}`;
      newStatus = "resolved";
    } else if (action === "dismiss") {
      actionTaken = "報告を却下しました";
      newStatus = "resolved";
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    // 報告を更新
    const updated = {
      ...report,
      status: newStatus,
      actionTaken,
      updatedAt: new Date().toISOString(),
      handledBy: req.user?.sub,
    };

    await docClient.send(new PutCommand({ TableName: REPORTS_TABLE, Item: updated }));

    res.json({ message: "Action executed successfully", report: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not execute action" });
  }
});

// ========== Admin: Users ==========

// 管理者: ユーザー一覧取得
app.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;
    const data = await docClient.send(new ScanCommand({ TableName: USERS_TABLE }));
    let users = data.Items || [];

    // 検索フィルター
    if (search && typeof search === "string") {
      const searchLower = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.userId?.toLowerCase().includes(searchLower) ||
          u.name?.toLowerCase().includes(searchLower)
      );
    }

    // ステータスフィルター
    if (status && typeof status === "string" && status !== "all") {
      if (status === "active") {
        users = users.filter((u) => !u.suspended && !u.deleted);
      } else if (status === "suspended") {
        users = users.filter((u) => u.suspended);
      } else if (status === "deleted") {
        users = users.filter((u) => u.deleted);
      }
    }

    // パスワードハッシュは除外
    const sanitized = users.map(({ passwordHash, ...rest }) => rest);

    res.json(sanitized);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not list users" });
  }
});

// 管理者: ユーザー詳細取得
app.get("/admin/users/:userId", requireAdmin, async (req, res) => {
  const userId = req.params.userId;

  try {
    const { Item } = await docClient.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
    );

    if (!Item) return res.status(404).json({ error: "User not found" });

    // パスワードハッシュは除外
    const { passwordHash, ...user } = Item;

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not get user" });
  }
});

// 管理者: ユーザー情報更新
app.put("/admin/users/:userId", requireAdmin, async (req, res) => {
  const userId = req.params.userId;
  const { name } = req.body || {};

  try {
    const { Item } = await docClient.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
    );

    if (!Item) return res.status(404).json({ error: "User not found" });

    const updated = {
      ...Item,
      name: name !== undefined ? name : Item.name,
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: updated }));

    const { passwordHash, ...sanitized } = updated;
    res.json(sanitized);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update user" });
  }
});

// 管理者: ユーザーステータス変更
app.put("/admin/users/:userId/status", requireAdmin, async (req, res) => {
  const userId = req.params.userId;
  const { suspended, deleted } = req.body || {};

  try {
    const { Item } = await docClient.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
    );

    if (!Item) return res.status(404).json({ error: "User not found" });

    const updated = {
      ...Item,
      suspended: suspended !== undefined ? suspended : Item.suspended,
      deleted: deleted !== undefined ? deleted : Item.deleted,
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: updated }));

    const { passwordHash, ...sanitized } = updated;
    res.json(sanitized);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update user status" });
  }
});

// 管理者: ユーザー削除
app.delete("/admin/users/:userId", requireAdmin, async (req, res) => {
  const userId = req.params.userId;

  try {
    const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
    await docClient.send(new DeleteCommand({ TableName: USERS_TABLE, Key: { userId } }));
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete user" });
  }
});

// 管理者: ユーザーアクティビティ履歴
app.get("/admin/users/:userId/activity", requireAdmin, async (req, res) => {
  const userId = req.params.userId;

  try {
    const [chatsData, checkinsData, reviewsData] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: CHATS_TABLE })),
      docClient.send(new ScanCommand({ TableName: CHECKINS_TABLE })),
      docClient.send(new ScanCommand({ TableName: REVIEWS_TABLE })),
    ]);

    const chats = (chatsData.Items || []).filter((c) =>
      Array.isArray(c.participants) && c.participants.includes(userId)
    );
    const checkins = (checkinsData.Items || []).filter((c) => c.userId === userId);
    const reviews = (reviewsData.Items || []).filter((r) => r.userId === userId);

    res.json({
      chats: chats.length,
      checkins: checkins.length,
      reviews: reviews.length,
      chatList: chats,
      checkinList: checkins,
      reviewList: reviews,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch user activity" });
  }
});

app.use((req, res) => res.status(404).json({ error: "Not Found" }));

exports.handler = serverless(app);
module.exports.app = app; // local用にexport
