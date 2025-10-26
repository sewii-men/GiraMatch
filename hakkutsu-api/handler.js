// hakkutsu-api/handler.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  QueryCommand,
  UpdateCommand,
  BatchGetCommand,
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
  .map((s) => s.trim().replace(/\/$/, "").toLowerCase())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins if wildcard '*' is present in config
      if (allowedOrigins.includes("*")) return callback(null, true);
      // Allow same-origin/no-origin requests (e.g., curl, server-to-server)
      if (!origin) return callback(null, true);
      // Exact match against allowlist
      const normalized = origin.replace(/\/$/, "").toLowerCase();
      if (allowedOrigins.includes(normalized)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
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
const RECRUITMENTS_TABLE = process.env.RECRUITMENTS_TABLE;
const REQUESTS_TABLE = process.env.REQUESTS_TABLE;
const RESTAURANTS_TABLE = process.env.RESTAURANTS_TABLE;
const POST_MATCH_CHATS_TABLE = process.env.POST_MATCH_CHATS_TABLE;
const POST_MATCH_CHAT_MESSAGES_TABLE = process.env.POST_MATCH_CHAT_MESSAGES_TABLE;
const RESTAURANT_SHARES_TABLE = process.env.RESTAURANT_SHARES_TABLE;
const CHAT_PARTICIPANTS_TABLE = process.env.CHAT_PARTICIPANTS_TABLE;
const SYSTEM_API_TOKEN = process.env.SYSTEM_API_TOKEN;

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
    req.user = { userId: payload.sub, name: payload.name }; // normalize payload
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

function requireSystemAuth(req, res, next) {
  if (!SYSTEM_API_TOKEN) {
    return res.status(500).json({ error: "SYSTEM_API_TOKEN is not configured" });
  }

  const h = req.headers["authorization"] || req.headers["Authorization"];
  if (!h || typeof h !== "string" || !h.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = h.slice("Bearer ".length).trim();
  if (token !== SYSTEM_API_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

function getUserIdFromRequest(req) {
  try {
    const h = req.headers["authorization"] || req.headers["Authorization"];
    if (!h || typeof h !== "string" || !h.startsWith("Bearer ")) return null;
    const token = h.slice("Bearer ".length).trim();
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.sub || null;
  } catch {
    return null;
  }
}

function mapRestaurantItem(item) {
  if (!item) return null;
  return {
    restaurantId: item.restaurant_id,
    name: item.name,
    address: item.address,
    category: item.category,
    imageUrl: item.image_url,
    googleMapUrl: item.google_map_url,
    latitude: item.latitude,
    longitude: item.longitude,
    distance: item.distance,
  };
}

function mapChatResponse(chatItem, matchItem) {
  if (!chatItem) return null;
  return {
    chatId: chatItem.chat_id,
    matchId: chatItem.match_id,
    opponent: chatItem.opponent || matchItem?.opponent || "",
    date: matchItem?.date || chatItem.date || "",
    startTime: chatItem.start_time,
    endTime: chatItem.end_time,
    isClosed: !!chatItem.is_closed,
    participantCount: chatItem.participant_count || 0,
  };
}

function mapMessageResponse(item, restaurant, user) {
  if (!item) return null;
  return {
    messageId: item.message_id,
    userId: item.user_id,
    nickname: user?.nickname || user?.name || item.user_id,
    icon: user?.icon || "👤",
    text: item.text,
    restaurant: restaurant || null,
    createdAt: item.created_at,
    updatedAt: item.updated_at || null,
    isDeleted: !!item.is_deleted,
  };
}

async function batchGetRestaurantsByIds(ids = []) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length || !RESTAURANTS_TABLE) return {};

  const result = await docClient.send(
    new BatchGetCommand({
      RequestItems: {
        [RESTAURANTS_TABLE]: {
          Keys: unique.map((id) => ({ restaurant_id: id })),
        },
      },
    })
  );

  const map = {};
  (result.Responses?.[RESTAURANTS_TABLE] || []).forEach((item) => {
    map[item.restaurant_id] = mapRestaurantItem(item);
  });
  return map;
}

async function batchGetUsersByIds(ids = []) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return {};

  const result = await docClient.send(
    new BatchGetCommand({
      RequestItems: {
        [USERS_TABLE]: {
          Keys: unique.map((id) => ({ userId: id })),
        },
      },
    })
  );

  const map = {};
  (result.Responses?.[USERS_TABLE] || []).forEach((item) => {
    map[item.userId] = item;
  });
  return map;
}

function getCurrentUserId(req) {
  return req.user?.userId || req.user?.sub;
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
  const { userId, name, password, birthDate } = req.body || {};
  if (!userId || !name || !password || !birthDate) return res.status(400).json({ error: "userId, name, password, birthDate are required" });
  const idErr = validateUserId(userId);
  if (idErr) return res.status(400).json({ error: idErr });
  const nameErr = validateDisplayName(name);
  if (nameErr) return res.status(400).json({ error: nameErr });
  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  const birthDateObj = new Date(birthDate);
  const today = new Date();
  if (!birthDate || typeof birthDate !== "string" || isNaN(birthDateObj.getTime()) || birthDateObj > today) {
    return res.status(400).json({ error: "有効な誕生日を入力してください" });
  }
  const minDate = new Date();
  minDate.setFullYear(today.getFullYear() - 150);
  if (birthDateObj < minDate) return res.status(400).json({ error: "誕生日が無効です" });
  try {
    const exist = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId } }));
    if (exist.Item) return res.status(409).json({ error: "User already exists" });
    const passwordHash = await bcrypt.hash(password, 10);
    const item = {
      userId,
      name,
      passwordHash,
      birthDate,
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
  const envAdminEmail = process.env.ADMIN_EMAIL;
  const envAdminPassword = process.env.ADMIN_PASSWORD;
  // Only enforce userId format for non-env-admin logins
  if (!(envAdminEmail && userId === envAdminEmail)) {
    const idErr = validateUserId(userId);
    if (idErr) return res.status(400).json({ error: idErr });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: "パスワードは8〜72文字で入力してください" });
  }
  try {
    let { Item } = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId } }));

    if ((!Item || !Item.passwordHash) && envAdminEmail && envAdminPassword && userId === envAdminEmail && password === envAdminPassword) {
      const passwordHash = await bcrypt.hash(envAdminPassword, 10);
      const adminItem = {
        userId: envAdminEmail,
        name: Item?.name || "管理者",
        passwordHash,
        isAdmin: true,
        createdAt: Item?.createdAt || new Date().toISOString(),
        suspended: Item?.suspended || false,
        deleted: Item?.deleted || false,
      };
      await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: adminItem }));
      Item = adminItem;
    }

    if (!Item || !Item.passwordHash) return res.status(401).json({ error: "Invalid credentials" });

    // If this is the env admin user, accept env password as truth source even if hash mismatch
    let ok = false;
    if (envAdminEmail && envAdminPassword && userId === envAdminEmail) {
      ok = password === envAdminPassword || (await bcrypt.compare(password, Item.passwordHash));
      // Keep DB hash in sync with env password if different
      if (password === envAdminPassword) {
        const currentHashMatches = await bcrypt.compare(envAdminPassword, Item.passwordHash);
        if (!currentHashMatches) {
          const newHash = await bcrypt.hash(envAdminPassword, 10);
          await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: { ...Item, passwordHash: newHash, isAdmin: true } }));
          Item.passwordHash = newHash;
          Item.isAdmin = true;
        }
      }
      // Ensure admin flag
      if (!Item.isAdmin) {
        await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: { ...Item, isAdmin: true } }));
        Item.isAdmin = true;
      }
    } else {
      ok = await bcrypt.compare(password, Item.passwordHash);
    }

    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ sub: userId, name: Item.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { userId, name: Item.name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not login" });
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

// ========== Recruitments ==========
// 募集を作成
app.post("/matching/recruit", requireAuth, async (req, res) => {
  try {
    const { matchId, conditions, message } = req.body;
    const userId = req.user.userId;

    console.log("Recruit request:", { matchId, userId, conditions, message });

    if (!matchId || !conditions || !message) {
      return res.status(400).json({ error: "matchId, conditions, and message are required" });
    }

    // Get match and user details
    console.log("Fetching match:", matchId);
    const matchData = await docClient.send(new GetCommand({
      TableName: MATCHES_TABLE,
      Key: { matchId: String(matchId) }
    }));

    console.log("Fetching user:", userId);
    const userData = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId: String(userId) }
    }));

    if (!matchData.Item) {
      return res.status(404).json({ error: "Match not found" });
    }

    if (!userData.Item) {
      return res.status(404).json({ error: "User not found" });
    }

    const recruitmentId = `recruitment-${Date.now()}-${userId}`;
    const recruitment = {
      id: recruitmentId,
      matchId,
      recruiterId: userId,
      conditions,
      message,
      opponent: matchData.Item.opponent,
      date: matchData.Item.date,
      time: matchData.Item.time,
      venue: matchData.Item.venue,
      recruiterNickname: userData.Item.nickname || userData.Item.name,
      recruiterGender: userData.Item.gender,
      recruiterIcon: userData.Item.icon,
      recruiterTrustScore: userData.Item.trustScore || 0,
      recruiterBirthDate: userData.Item.birthDate,
      recruiterStyle: userData.Item.style,
      recruiterSeat: userData.Item.seat,
      createdAt: new Date().toISOString(),
      status: "active"
    };

    await docClient.send(new PutCommand({
      TableName: RECRUITMENTS_TABLE,
      Item: recruitment
    }));

    res.json({ success: true, recruitment });
  } catch (error) {
    console.error("Error creating recruitment:", error);
    res.status(500).json({ error: "Could not create recruitment", details: error.message });
  }
});

// 募集一覧を取得
app.get("/matching/recruitments", async (req, res) => {
  try {
    const currentUserId = getUserIdFromRequest(req);
    let requestedRecruitmentIds = new Set();

    if (currentUserId) {
      const requestsData = await docClient.send(new ScanCommand({
        TableName: REQUESTS_TABLE
      }));

      requestedRecruitmentIds = new Set(
        (requestsData.Items || [])
          .filter((req) => req.requesterId === currentUserId && (req.isRequested ?? true))
          .map((req) => req.recruitmentId)
      );

      console.log("✅ 認証済みユーザーのリクエスト数:", requestedRecruitmentIds.size);
    }

    const data = await docClient.send(new ScanCommand({
      TableName: RECRUITMENTS_TABLE
    }));

    console.log("📋 DynamoDBから取得した募集データ件数:", data.Items?.length);
    if (data.Items && data.Items.length > 0) {
      console.log("📋 最初の募集の生データ:", JSON.stringify(data.Items[0], null, 2));
    }

    const activeRecruitments = (data.Items || [])
      .filter(r => r.status === "active")
      .map(r => {
        console.log(`📋 募集ID ${r.id} の recruiterBirthDate:`, r.recruiterBirthDate);
        return {
          id: r.id,
          matchId: r.matchId,
          opponent: r.opponent,
          date: r.date,
          time: r.time,
          venue: r.venue,
          conditions: r.conditions || [],
          message: r.message,
          recruiter: {
            userId: r.recruiterId,
            nickname: r.recruiterNickname,
            gender: r.recruiterGender,
            icon: r.recruiterIcon,
            trustScore: r.recruiterTrustScore,
            birthDate: r.recruiterBirthDate
          },
          createdAt: r.createdAt,
          requestSent: requestedRecruitmentIds.has(r.id)
        };
      });

    console.log("📋 返却する募集データ件数:", activeRecruitments.length);
    if (activeRecruitments.length > 0) {
      console.log("📋 最初の募集のレスポンス:", JSON.stringify(activeRecruitments[0], null, 2));
    }

    res.json(activeRecruitments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch recruitments" });
  }
});

// 自分の募集一覧を取得
app.get("/matching/my-recruitments", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const recruitmentsData = await docClient.send(new QueryCommand({
      TableName: RECRUITMENTS_TABLE,
      IndexName: "RecruiterIdIndex",
      KeyConditionExpression: "recruiterId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    }));

    const requestsData = await docClient.send(new QueryCommand({
      TableName: REQUESTS_TABLE,
      IndexName: "RecruiterIdIndex",
      KeyConditionExpression: "recruiterId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    }));

    const requestCounts = (requestsData.Items || [])
      .reduce((acc, req) => {
        acc[req.recruitmentId] = (acc[req.recruitmentId] || 0) + 1;
        return acc;
      }, {});

    const myRecruitments = (recruitmentsData.Items || [])
      .map(r => ({
        id: r.id,
        matchId: r.matchId,
        matchName: r.opponent,
        opponent: r.opponent,
        date: r.date,
        time: r.time,
        venue: r.venue,
        status: r.status || "active",
        conditions: r.conditions || [],
        message: r.message,
        requestCount: requestCounts[r.id] || 0,
        createdAt: r.createdAt
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(myRecruitments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch my recruitments" });
  }
});

// 自分が送ったリクエスト一覧を取得
app.get("/matching/my-requests", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestsData = await docClient.send(new ScanCommand({
      TableName: REQUESTS_TABLE
    }));

    const myRequests = (requestsData.Items || []).filter(
      (req) => req.requesterId === userId && (req.isRequested ?? true)
    );

    if (!myRequests.length) {
      return res.json([]);
    }

    const recruitmentIds = [...new Set(myRequests.map((req) => req.recruitmentId))];
    const recruitmentMap = {};

    for (let i = 0; i < recruitmentIds.length; i += 100) {
      const chunk = recruitmentIds.slice(i, i + 100);
      const batchResult = await docClient.send(new BatchGetCommand({
        RequestItems: {
          [RECRUITMENTS_TABLE]: {
            Keys: chunk.map((id) => ({ id }))
          }
        }
      }));
      (batchResult.Responses?.[RECRUITMENTS_TABLE] || []).forEach((item) => {
        recruitmentMap[item.id] = item;
      });
    }

    const recruiterIds = [...new Set(myRequests.map((req) => req.recruiterId).filter(Boolean))];
    const recruiterProfiles = {};

    for (let i = 0; i < recruiterIds.length; i += 100) {
      const chunk = recruiterIds.slice(i, i + 100);
      const batchResult = await docClient.send(new BatchGetCommand({
        RequestItems: {
          [USERS_TABLE]: {
            Keys: chunk.map((id) => ({ userId: id }))
          }
        }
      }));
      (batchResult.Responses?.[USERS_TABLE] || []).forEach((item) => {
        recruiterProfiles[item.userId] = item;
      });
    }

    const response = myRequests
      .map((req) => {
        const recruitment = recruitmentMap[req.recruitmentId] || {};
        const recruiterProfile = recruiterProfiles[req.recruiterId] || {};
        const fallbackRecruiter = {
          nickname: recruitment.recruiterNickname || req.recruiterNickname,
          gender: recruitment.recruiterGender ?? req.recruiterGender ?? null,
          icon: recruitment.recruiterIcon || req.recruiterIcon,
          trustScore: recruitment.recruiterTrustScore ?? req.recruiterTrustScore ?? null,
          birthDate: recruitment.recruiterBirthDate || req.recruiterBirthDate || null,
          style: recruitment.recruiterStyle || req.recruiterStyle || null,
          seat: recruitment.recruiterSeat || req.recruiterSeat || null,
        };
        const fallbackRequester = {
          nickname: req.requesterNickname,
          gender: req.requesterGender,
          icon: req.requesterIcon,
          trustScore: req.requesterTrustScore,
          birthDate: req.requesterBirthDate,
          style: req.requesterStyle,
          seat: req.requesterSeat,
        };
        return {
          requestId: req.id,
          recruitmentId: req.recruitmentId,
          matchId: req.matchId,
          status: req.status || "pending",
          createdAt: req.createdAt,
          isRequested: req.isRequested ?? true,
          opponent: recruitment.opponent || "",
          date: recruitment.date || "",
          time: recruitment.time || "",
          venue: recruitment.venue || "",
          message: recruitment.message || "",
          conditions: recruitment.conditions || [],
          recruiter: {
            userId: req.recruiterId,
            nickname:
              recruiterProfile.nickname ||
              recruiterProfile.name ||
              fallbackRecruiter.nickname ||
              req.recruiterId,
            gender: recruiterProfile.gender ?? fallbackRecruiter.gender ?? null,
            icon: recruiterProfile.icon || fallbackRecruiter.icon || "👤",
            trustScore: recruiterProfile.trustScore ?? fallbackRecruiter.trustScore ?? null,
            birthDate: recruiterProfile.birthDate ?? fallbackRecruiter.birthDate ?? null,
            style: recruiterProfile.style ?? fallbackRecruiter.style ?? null,
            seat: recruiterProfile.seat ?? fallbackRecruiter.seat ?? null,
          },
          requester: {
            userId: req.requesterId,
            nickname: fallbackRequester.nickname || req.requesterId,
            gender: fallbackRequester.gender ?? null,
            icon: fallbackRequester.icon || "👤",
            trustScore: fallbackRequester.trustScore ?? null,
            birthDate: fallbackRequester.birthDate ?? null,
            style: fallbackRequester.style ?? null,
            seat: fallbackRequester.seat ?? null,
          },
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch my requests" });
  }
});

// 自分の募集詳細を取得
app.get("/matching/my-recruitments/:recruitmentId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recruitmentId } = req.params;

    const { Item } = await docClient.send(new GetCommand({
      TableName: RECRUITMENTS_TABLE,
      Key: { id: recruitmentId }
    }));

    if (!Item) {
      return res.status(404).json({ error: "Recruitment not found" });
    }

    if (Item.recruiterId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const requestsData = await docClient.send(new ScanCommand({
      TableName: REQUESTS_TABLE
    }));

    const requestCount = (requestsData.Items || []).filter(
      (req) => req.recruitmentId === recruitmentId
    ).length;

    const recruitment = {
      id: Item.id,
      matchId: Item.matchId,
      matchName: Item.opponent,
      opponent: Item.opponent,
      date: Item.date,
      time: Item.time,
      venue: Item.venue,
      status: Item.status || "active",
      conditions: Item.conditions || [],
      message: Item.message,
      requestCount,
      createdAt: Item.createdAt
    };

    res.json(recruitment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch recruitment detail" });
  }
});

// 募集を取り消す（キャンセル）
app.delete("/matching/my-recruitments/:recruitmentId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recruitmentId } = req.params;

    // 募集を取得して所有者を確認
    const { Item } = await docClient.send(new GetCommand({
      TableName: RECRUITMENTS_TABLE,
      Key: { id: recruitmentId }
    }));

    if (!Item) {
      return res.status(404).json({ error: "Recruitment not found" });
    }

    if (Item.recruiterId !== userId) {
      return res.status(403).json({ error: "Forbidden: You can only cancel your own recruitments" });
    }

    // 既にキャンセル済みの場合
    if (Item.status === "cancelled") {
      return res.status(400).json({ error: "Recruitment is already cancelled" });
    }

    // statusをcancelledに更新
    await docClient.send(new UpdateCommand({
      TableName: RECRUITMENTS_TABLE,
      Key: { id: recruitmentId },
      UpdateExpression: "SET #status = :cancelled, updatedAt = :now",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":cancelled": "cancelled",
        ":now": new Date().toISOString()
      }
    }));

    res.json({
      success: true,
      message: "Recruitment cancelled successfully",
      recruitmentId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not cancel recruitment" });
  }
});

// 取り消し済みの募集を削除（論理削除）
app.delete("/matching/my-recruitments/:recruitmentId/permanent", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recruitmentId } = req.params;

    // 募集を取得して所有者を確認
    const { Item } = await docClient.send(new GetCommand({
      TableName: RECRUITMENTS_TABLE,
      Key: { id: recruitmentId }
    }));

    if (!Item) {
      return res.status(404).json({ error: "Recruitment not found" });
    }

    if (Item.recruiterId !== userId) {
      return res.status(403).json({ error: "Forbidden: You can only delete your own recruitments" });
    }

    // キャンセル済みの募集のみ削除可能
    if (Item.status !== "cancelled") {
      return res.status(400).json({ error: "Only cancelled recruitments can be deleted" });
    }

    // statusをdeletedに更新
    await docClient.send(new UpdateCommand({
      TableName: RECRUITMENTS_TABLE,
      Key: { id: recruitmentId },
      UpdateExpression: "SET #status = :deleted, deletedAt = :now",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":deleted": "deleted",
        ":now": new Date().toISOString()
      }
    }));

    res.json({
      success: true,
      message: "Recruitment deleted successfully",
      recruitmentId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete recruitment" });
  }
});

// 自分の募集に届いたリクエスト一覧
app.get("/matching/my-recruitments/:recruitmentId/requests", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recruitmentId } = req.params;

    const { Item } = await docClient.send(new GetCommand({
      TableName: RECRUITMENTS_TABLE,
      Key: { id: recruitmentId }
    }));

    if (!Item) {
      return res.status(404).json({ error: "Recruitment not found" });
    }

    if (Item.recruiterId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const requestsData = await docClient.send(new ScanCommand({
      TableName: REQUESTS_TABLE
    }));

    const relevantRequests = (requestsData.Items || [])
      .filter((req) => req.recruitmentId === recruitmentId && req.recruiterId === userId);

    const requesterIds = [...new Set(relevantRequests.map((req) => req.requesterId))];
    const requesterProfiles = {};

    await Promise.all(
      requesterIds.map(async (requesterId) => {
        const { Item: profile } = await docClient.send(new GetCommand({
          TableName: USERS_TABLE,
          Key: { userId: requesterId }
        }));
        if (profile) requesterProfiles[requesterId] = profile;
      })
    );

    const requests = relevantRequests
      .map((req) => {
        const profile = requesterProfiles[req.requesterId] || {};
        const fallbackRequester = {
          nickname: req.requesterNickname,
          gender: req.requesterGender,
          icon: req.requesterIcon,
          trustScore: req.requesterTrustScore,
          style: req.requesterStyle,
          seat: req.requesterSeat,
          birthDate: req.requesterBirthDate,
        };
        return {
          id: req.id,
          recruitmentId: req.recruitmentId,
          requesterId: req.requesterId,
          recruiterId: req.recruiterId,
          status: req.status || "pending",
          createdAt: req.createdAt,
          requester: {
            userId: req.requesterId,
            nickname: profile.nickname || profile.name || fallbackRequester.nickname || req.requesterId,
            gender: profile.gender ?? fallbackRequester.gender ?? null,
            icon: profile.icon || fallbackRequester.icon || "👤",
            trustScore: profile.trustScore ?? fallbackRequester.trustScore ?? null,
            style: profile.style ?? fallbackRequester.style ?? null,
            seat: profile.seat ?? fallbackRequester.seat ?? null,
            birthDate: profile.birthDate ?? fallbackRequester.birthDate ?? null,
          },
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const recruitment = {
      id: Item.id,
      matchId: Item.matchId,
      opponent: Item.opponent,
      date: Item.date,
      time: Item.time,
      venue: Item.venue,
      status: Item.status || "active",
      message: Item.message,
      conditions: Item.conditions || [],
      createdAt: Item.createdAt,
      requestCount: requests.length,
    };

    res.json({ recruitment, requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch recruitment requests" });
  }
});

async function findRequestById(requestId) {
  if (!requestId) return null;
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: REQUESTS_TABLE,
      Key: { id: requestId },
    })
  );
  if (Item) return Item;

  const fallback = await docClient.send(
    new ScanCommand({
      TableName: REQUESTS_TABLE,
      FilterExpression: "#id = :requestId OR requestId = :requestId",
      ExpressionAttributeNames: { "#id": "id" },
      ExpressionAttributeValues: { ":requestId": requestId },
      Limit: 1,
    })
  );
  return (fallback.Items && fallback.Items[0]) || null;
}

async function findActiveRequestByRecruitment(recruitmentId, requesterId) {
  if (!recruitmentId || !requesterId) return null;
  const data = await docClient.send(
    new ScanCommand({
      TableName: REQUESTS_TABLE,
    })
  );
  return (data.Items || []).find(
    (req) =>
      req.recruitmentId === recruitmentId &&
      req.requesterId === requesterId &&
      (req.isRequested ?? true)
  );
}

async function cancelRequestRecord(requestId) {
  if (!requestId) {
    throw new Error("requestId is required to cancel a request");
  }
  const now = new Date().toISOString();
  await docClient.send(
    new UpdateCommand({
      TableName: REQUESTS_TABLE,
      Key: { id: requestId },
      UpdateExpression: "SET isRequested = :false, #status = :status, cancelledAt = :now",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":false": false,
        ":status": "cancelled",
        ":now": now,
      },
    })
  );
}

// 参加リクエストを送信
app.post("/matching/request", requireAuth, async (req, res) => {
  try {
    const { recruitmentId } = req.body;
    const userId = req.user.userId;

    if (!recruitmentId) {
      return res.status(400).json({ error: "recruitmentId is required" });
    }

    // Get recruitment details
    const recruitmentData = await docClient.send(new ScanCommand({
      TableName: RECRUITMENTS_TABLE
    }));
    const recruitment = (recruitmentData.Items || []).find(r => r.id === recruitmentId);

    if (!recruitment) {
      return res.status(404).json({ error: "Recruitment not found" });
    }

    // Check if user is the recruiter
    if (recruitment.recruiterId === userId) {
      return res.status(400).json({ error: "You cannot request to join your own recruitment" });
    }

    // Check for existing request
    const existingRequest = await findActiveRequestByRecruitment(recruitmentId, userId);
    if (existingRequest) {
      return res.status(409).json({ error: "Request already sent" });
    }

    const userData = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId: String(userId) }
    }));

    if (!userData.Item) {
      return res.status(404).json({ error: "User not found" });
    }

    const requestId = `request-${Date.now()}-${userId}`;
    const request = {
      id: requestId,
      recruitmentId,
      requesterId: userId,
      recruiterId: recruitment.recruiterId,
      status: "pending",
      createdAt: new Date().toISOString(),
      isRequested: true,
      // Add requester details for denormalization
      requesterNickname: userData.Item.nickname || userData.Item.name,
      requesterGender: userData.Item.gender,
      requesterIcon: userData.Item.icon,
      requesterTrustScore: userData.Item.trustScore || 0,
      requesterBirthDate: userData.Item.birthDate,
      requesterStyle: userData.Item.style,
      requesterSeat: userData.Item.seat,
    };

    await docClient.send(new PutCommand({
      TableName: REQUESTS_TABLE,
      Item: request
    }));

    res.json({ success: true, request });

  } catch (error) {
    console.error("Error creating request:", error);
    res.status(500).json({ error: "Could not create request" });
  }
});

module.exports.handler = serverless(app);
module.exports.app = app;