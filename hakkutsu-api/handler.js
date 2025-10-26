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
function validateEmail(email) {
  if (typeof email !== "string") return "メールアドレスは文字列で指定してください";
  const v = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "有効なメールアドレスを入力してください";
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
function generateUserId() {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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

// 登録
app.post("/auth/register", async (req, res) => {
  const { email, name, password, nickname, birthDate, gender, icon, style, seat } = req.body || {};
  if (!email || !name || !password) return res.status(400).json({ error: "email, name, password are required" });
  const emailErr = validateEmail(email);
  if (emailErr) return res.status(400).json({ error: emailErr });
  const nameErr = validateDisplayName(name);
  if (nameErr) return res.status(400).json({ error: nameErr });
  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  try {
    // メールアドレスの重複チェック
    const scanResult = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: { ":email": email.trim().toLowerCase() }
    }));
    if (scanResult.Items && scanResult.Items.length > 0) {
      return res.status(409).json({ error: "このメールアドレスは既に登録されています" });
    }

    const userId = generateUserId();
    const passwordHash = await bcrypt.hash(password, 10);
    const item = {
      userId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      nickname: nickname ? nickname.trim() : name.trim(),
      passwordHash,
      isAdmin: false,
      birthDate: birthDate || null,
      gender: gender || null,
      icon: icon || "👤",
      style: style || null,
      seat: seat || null,
      trustScore: 0,
      createdAt: new Date().toISOString()
    };
    await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: item }));
    const token = jwt.sign({ sub: userId, name: item.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { userId, name: item.name, email: item.email, nickname: item.nickname } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not register" });
  }
});

// ログイン
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });

  const envAdminEmail = process.env.ADMIN_EMAIL;
  const envAdminPassword = process.env.ADMIN_PASSWORD;

  const emailErr = validateEmail(email);
  if (emailErr) return res.status(400).json({ error: emailErr });

  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: "パスワードは8〜72文字で入力してください" });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    // メールアドレスでユーザーを検索
    const scanResult = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: { ":email": normalizedEmail }
    }));

    let Item = scanResult.Items && scanResult.Items.length > 0 ? scanResult.Items[0] : null;

    // 環境変数の管理者アカウントでのログイン処理
    if ((!Item || !Item.passwordHash) && envAdminEmail && envAdminPassword && normalizedEmail === envAdminEmail.toLowerCase() && password === envAdminPassword) {
      const passwordHash = await bcrypt.hash(envAdminPassword, 10);
      const userId = Item?.userId || generateUserId();
      const adminItem = {
        userId,
        email: normalizedEmail,
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

    if (!Item || !Item.passwordHash) return res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });

    // 管理者アカウントの特別処理
    let ok = false;
    if (envAdminEmail && envAdminPassword && normalizedEmail === envAdminEmail.toLowerCase()) {
      ok = password === envAdminPassword || (await bcrypt.compare(password, Item.passwordHash));
      // パスワードハッシュを環境変数と同期
      if (password === envAdminPassword) {
        const currentHashMatches = await bcrypt.compare(envAdminPassword, Item.passwordHash);
        if (!currentHashMatches) {
          const newHash = await bcrypt.hash(envAdminPassword, 10);
          await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: { ...Item, passwordHash: newHash, isAdmin: true } }));
          Item.passwordHash = newHash;
          Item.isAdmin = true;
        }
      }
      // 管理者フラグを確実に設定
      if (!Item.isAdmin) {
        await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: { ...Item, isAdmin: true } }));
        Item.isAdmin = true;
      }
    } else {
      ok = await bcrypt.compare(password, Item.passwordHash);
    }

    if (!ok) return res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
    const token = jwt.sign({ sub: Item.userId, name: Item.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { userId: Item.userId, name: Item.name, email: Item.email } });
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
    console.log("📋 /matching/recruitments endpoint called");
    console.log("📋 RECRUITMENTS_TABLE:", RECRUITMENTS_TABLE);
    console.log("📋 REQUESTS_TABLE:", REQUESTS_TABLE);

    if (!RECRUITMENTS_TABLE) {
      console.error("❌ RECRUITMENTS_TABLE is not defined");
      return res.status(500).json({ error: "RECRUITMENTS_TABLE is not configured" });
    }

    const currentUserId = getUserIdFromRequest(req);
    let requestedRecruitmentIds = new Set();

    if (currentUserId && REQUESTS_TABLE) {
      try {
        const requestsData = await docClient.send(new ScanCommand({
          TableName: REQUESTS_TABLE
        }));

        requestedRecruitmentIds = new Set(
          (requestsData.Items || [])
            .filter((req) => req.requesterId === currentUserId && (req.isRequested ?? true))
            .map((req) => req.recruitmentId)
        );

        console.log("✅ 認証済みユーザーのリクエスト数:", requestedRecruitmentIds.size);
      } catch (requestError) {
        console.error("⚠️ Error fetching requests (non-fatal):", requestError);
      }
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
    console.error("❌ Error in /matching/recruitments:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      error: "Could not fetch recruitments",
      details: error.message,
      tableName: RECRUITMENTS_TABLE
    });
  }
});

// 自分の募集一覧を取得
app.get("/matching/my-recruitments", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [recruitmentsData, requestsData] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: RECRUITMENTS_TABLE })),
      docClient.send(new ScanCommand({ TableName: REQUESTS_TABLE })),
    ]);

    const requestCounts = (requestsData.Items || [])
      .filter((req) => req.recruiterId === userId)
      .reduce((acc, req) => {
        acc[req.recruitmentId] = (acc[req.recruitmentId] || 0) + 1;
        return acc;
      }, {});

    const myRecruitments = (recruitmentsData.Items || [])
      .filter(r => r.recruiterId === userId)
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

    if (recruitment.recruiterId === userId) {
      return res.status(400).json({ error: "Cannot request your own recruitment" });
    }

    const { Item: requesterProfile } = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    if (!requesterProfile) {
      return res.status(404).json({ error: "Requester profile not found" });
    }

    const existingRequests = await docClient.send(new ScanCommand({
      TableName: REQUESTS_TABLE
    }));
    const alreadyRequested = (existingRequests.Items || []).some(
      (req) => req.recruitmentId === recruitmentId && req.requesterId === userId && (req.isRequested ?? true)
    );

    if (alreadyRequested) {
      return res.status(409).json({ error: "Request already sent for this recruitment" });
    }

    const requestId = `request-${Date.now()}-${userId}`;
    const request = {
      id: requestId,
      recruitmentId,
      requesterId: userId,
      recruiterId: recruitment.recruiterId,
      matchId: recruitment.matchId,
      status: "pending",
      createdAt: new Date().toISOString(),
      isRequested: true,
      requesterNickname: requesterProfile.nickname || requesterProfile.name || userId,
      requesterGender: requesterProfile.gender || null,
      requesterIcon: requesterProfile.icon || null,
      requesterTrustScore: requesterProfile.trustScore ?? null,
      requesterBirthDate: requesterProfile.birthDate || null,
      requesterStyle: requesterProfile.style || null,
      requesterSeat: requesterProfile.seat || null,
      recruiterNickname: recruitment.recruiterNickname || null,
      recruiterGender: recruitment.recruiterGender || null,
      recruiterIcon: recruitment.recruiterIcon || null,
      recruiterTrustScore: recruitment.recruiterTrustScore ?? null,
      recruiterBirthDate: recruitment.recruiterBirthDate || null,
      recruiterStyle: recruitment.recruiterStyle || null,
      recruiterSeat: recruitment.recruiterSeat || null,
    };

    await docClient.send(new PutCommand({
      TableName: REQUESTS_TABLE,
      Item: request
    }));

    res.json({ success: true, request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not send request" });
  }
});

// 送信済みリクエストを取り消し
app.delete("/matching/requests/:requestId", requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const requestItem = await findRequestById(requestId);
    if (!requestItem) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (requestItem.requesterId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await cancelRequestRecord(requestItem.id || requestId);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not cancel request" });
  }
});

// 送信済みリクエストを募集IDで取り消し（後方互換用）
app.delete("/matching/request", requireAuth, async (req, res) => {
  try {
    const { recruitmentId } = req.body || {};
    const userId = req.user.userId;
    if (!recruitmentId) {
      return res.status(400).json({ error: "recruitmentId is required" });
    }

    const requestItem = await findActiveRequestByRecruitment(recruitmentId, userId);
    if (!requestItem) {
      // 既に削除されている、または元々存在しない場合は成功として扱う
      return res.json({ success: true, message: "Request not found or already cancelled" });
    }

    await cancelRequestRecord(requestItem.id || requestItem.requestId);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not cancel request" });
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

// ========== ギラ飲み: 試合後チャット関連 ==========

// Get all restaurants
app.get("/restaurants", async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: RESTAURANTS_TABLE }));
    const items = (data.Items || []).map(mapRestaurantItem);
    res.json(items);
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    res.status(500).json({ error: "Could not fetch restaurants", details: error.message });
  }
});

// Enrich restaurants with Google Places details
app.post("/restaurants/details", async (req, res) => {
  const { restaurants } = req.body;
  const apiKey = process.env.PLACES_API_KEY;

  if (!apiKey) {
    return res.json(restaurants);
  }

  if (!Array.isArray(restaurants) || restaurants.length === 0) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const enrichedRestaurants = await Promise.all(
      restaurants.map(async (restaurant) => {
        try {
          const findPlaceUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
          findPlaceUrl.searchParams.append("input", restaurant.name);
          findPlaceUrl.searchParams.append("inputtype", "textquery");
          findPlaceUrl.searchParams.append("fields", "place_id,name,photos");
          findPlaceUrl.searchParams.append("key", apiKey);

          const findPlaceRes = await fetch(findPlaceUrl.toString());
          const findPlaceData = await findPlaceRes.json();

          if (findPlaceData.status !== "OK" || !findPlaceData.candidates || findPlaceData.candidates.length === 0) {
            return restaurant;
          }

          const place = findPlaceData.candidates[0];
          const newRestaurant = { ...restaurant, name: place.name };

          if (place.photos && place.photos.length > 0) {
            const photoReference = place.photos[0].photo_reference;
            const photoUrl = new URL("https://maps.googleapis.com/maps/api/place/photo");
            photoUrl.searchParams.append("maxwidth", "400");
            photoUrl.searchParams.append("photoreference", photoReference);
            photoUrl.searchParams.append("key", apiKey);
            newRestaurant.imageUrl = photoUrl.toString();
          }

          return newRestaurant;
        } catch (error) {
          return restaurant;
        }
      })
    );

    res.json(enrichedRestaurants);
  } catch (error) {
    res.status(500).json({ error: "Failed to enrich restaurant data" });
  }
});

app.get("/matches/:matchId/restaurants", requireAuth, async (req, res) => {
  if (!RESTAURANTS_TABLE) {
    return res.status(500).json({ error: "Restaurants table is not configured" });
  }

  const { matchId } = req.params;
  const category = req.query.category;
  const parsedLimit = parseInt(req.query.limit, 10);

  try {
    const { Item: match } = await docClient.send(
      new GetCommand({ TableName: MATCHES_TABLE, Key: { matchId } })
    );
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (!match.venue) return res.status(400).json({ error: "Match venue is not set" });

    const queryParams = {
      TableName: RESTAURANTS_TABLE,
      IndexName: "VenueDistanceIndex",
      KeyConditionExpression: "venue = :venue",
      ExpressionAttributeValues: {
        ":venue": match.venue,
      },
      ScanIndexForward: true,
    };

    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      queryParams.Limit = parsedLimit;
    }

    if (category) {
      queryParams.FilterExpression = "category = :category";
      queryParams.ExpressionAttributeValues[":category"] = category;
    }

    const data = await docClient.send(new QueryCommand(queryParams));
    res.json({
      restaurants: (data.Items || []).map(mapRestaurantItem),
      venue: {
        venueId: match.venueId || match.venue,
        name: match.venue,
        latitude: match.latitude,
        longitude: match.longitude,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch restaurants" });
  }
});

app.get("/matches/:matchId/post-match-chat", requireAuth, async (req, res) => {
  if (!POST_MATCH_CHATS_TABLE || !CHAT_PARTICIPANTS_TABLE) {
    return res.status(500).json({ error: "Post-match chat tables are not configured" });
  }

  const { matchId } = req.params;
  const userId = getCurrentUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const chatResp = await docClient.send(
      new QueryCommand({
        TableName: POST_MATCH_CHATS_TABLE,
        IndexName: "MatchIdIndex",
        KeyConditionExpression: "match_id = :matchId",
        ExpressionAttributeValues: { ":matchId": matchId },
        Limit: 1,
      })
    );

    const chatItem = chatResp.Items && chatResp.Items[0];
    if (!chatItem) {
      return res.status(404).json({ error: "Chat not found or not accessible" });
    }

    const chatId = chatItem.chat_id;

    const participantResp = await docClient.send(
      new GetCommand({
        TableName: CHAT_PARTICIPANTS_TABLE,
        Key: { chat_id: chatId, user_id: userId },
      })
    );

    if (!participantResp.Item) {
      return res.status(403).json({ error: "Chat not found or not accessible" });
    }

    const [messagesResp, matchResp] = await Promise.all([
      docClient.send(
        new QueryCommand({
          TableName: POST_MATCH_CHAT_MESSAGES_TABLE,
          IndexName: "ChatIdCreatedAtIndex",
          KeyConditionExpression: "chat_id = :chatId",
          ExpressionAttributeValues: { ":chatId": chatId },
          ScanIndexForward: true,
          Limit: 100,
        })
      ),
      docClient.send(new GetCommand({ TableName: MATCHES_TABLE, Key: { matchId } })),
    ]);

    const messageItems = messagesResp.Items || [];
    const [restaurantMap, userMap] = await Promise.all([
      batchGetRestaurantsByIds(messageItems.map((item) => item.restaurant_id)),
      batchGetUsersByIds(messageItems.map((item) => item.user_id)),
    ]);

    const messages = messageItems.map((item) =>
      mapMessageResponse(item, item.restaurant_id ? restaurantMap[item.restaurant_id] : null, userMap[item.user_id])
    );

    res.json({
      chat: mapChatResponse(chatItem, matchResp.Item),
      messages,
      userParticipation: {
        isParticipant: true,
        joinedAt: participantResp.Item.joined_at,
        lastReadAt: participantResp.Item.last_read_at || null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch chat" });
  }
});

app.post("/post-match-chats/:chatId/messages", requireAuth, async (req, res) => {
  if (!POST_MATCH_CHAT_MESSAGES_TABLE || !CHAT_PARTICIPANTS_TABLE) {
    return res.status(500).json({ error: "Post-match chat tables are not configured" });
  }

  const { chatId } = req.params;
  const userId = getCurrentUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { text, restaurantId } = req.body || {};
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }
  if (text.length > 500) {
    return res.status(400).json({ error: "text must be 500 characters or less" });
  }

  try {
    const chatResp = await docClient.send(
      new GetCommand({ TableName: POST_MATCH_CHATS_TABLE, Key: { chat_id: chatId } })
    );
    if (!chatResp.Item) return res.status(404).json({ error: "Chat not found or not accessible" });
    if (chatResp.Item.is_closed) return res.status(410).json({ error: "Chat is closed" });

    const participantResp = await docClient.send(
      new GetCommand({
        TableName: CHAT_PARTICIPANTS_TABLE,
        Key: { chat_id: chatId, user_id: userId },
      })
    );
    if (!participantResp.Item) {
      return res.status(403).json({ error: "Chat not found or not accessible" });
    }

    let restaurant = null;
    if (restaurantId) {
      const restaurantResp = await docClient.send(
        new GetCommand({
          TableName: RESTAURANTS_TABLE,
          Key: { restaurant_id: restaurantId },
        })
      );
      if (!restaurantResp.Item) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      restaurant = mapRestaurantItem(restaurantResp.Item);
    }

    const now = new Date().toISOString();
    const messageId = `msg_${Date.now()}`;
    const messageItem = {
      message_id: messageId,
      chat_id: chatId,
      user_id: userId,
      text: text.trim(),
      created_at: now,
      updated_at: null,
      is_deleted: false,
      ...(restaurantId ? { restaurant_id: restaurantId } : {}),
    };

    await docClient.send(
      new PutCommand({ TableName: POST_MATCH_CHAT_MESSAGES_TABLE, Item: messageItem })
    );

    if (restaurantId) {
      const shareItem = {
        share_id: `share_${Date.now()}`,
        chat_id: chatId,
        restaurant_id: restaurantId,
        message_id: messageId,
        user_id: userId,
        created_at: now,
      };
      await docClient.send(new PutCommand({ TableName: RESTAURANT_SHARES_TABLE, Item: shareItem }));
    }

    await docClient.send(
      new UpdateCommand({
        TableName: CHAT_PARTICIPANTS_TABLE,
        Key: { chat_id: chatId, user_id: userId },
        UpdateExpression: "SET last_read_at = :now",
        ExpressionAttributeValues: { ":now": now },
      })
    );

    const userMap = await batchGetUsersByIds([userId]);

    res.status(201).json({
      message: mapMessageResponse(messageItem, restaurant, userMap[userId]),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not send message" });
  }
});

app.get("/post-match-chats/:chatId/restaurant-shares", requireAuth, async (req, res) => {
  if (!RESTAURANT_SHARES_TABLE || !CHAT_PARTICIPANTS_TABLE) {
    return res.status(500).json({ error: "Restaurant share table is not configured" });
  }

  const { chatId } = req.params;
  const userId = getCurrentUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const participantResp = await docClient.send(
      new GetCommand({
        TableName: CHAT_PARTICIPANTS_TABLE,
        Key: { chat_id: chatId, user_id: userId },
      })
    );
    if (!participantResp.Item) {
      return res.status(403).json({ error: "Chat not found or not accessible" });
    }

    const sharesResp = await docClient.send(
      new QueryCommand({
        TableName: RESTAURANT_SHARES_TABLE,
        IndexName: "ChatIdRestaurantIdIndex",
        KeyConditionExpression: "chat_id = :chatId",
        ExpressionAttributeValues: { ":chatId": chatId },
      })
    );

    const shareItems = sharesResp.Items || [];
    if (!shareItems.length) {
      return res.json({ shares: [], totalShares: 0 });
    }

    const aggregated = shareItems.reduce((acc, item) => {
      const existing = acc[item.restaurant_id] || {
        restaurantId: item.restaurant_id,
        count: 0,
        lastSharedAt: item.created_at,
      };
      existing.count += 1;
      if (item.created_at > existing.lastSharedAt) {
        existing.lastSharedAt = item.created_at;
      }
      acc[item.restaurant_id] = existing;
      return acc;
    }, {});

    const restaurantMap = await batchGetRestaurantsByIds(Object.keys(aggregated));

    const shares = Object.values(aggregated).map((entry) => ({
      restaurant: restaurantMap[entry.restaurantId] || { restaurantId: entry.restaurantId },
      shareCount: entry.count,
      lastSharedAt: entry.lastSharedAt,
    }));

    res.json({ shares, totalShares: shareItems.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch restaurant shares" });
  }
});

app.post("/matches/:matchId/post-match-chat/create", requireSystemAuth, async (req, res) => {
  if (!POST_MATCH_CHATS_TABLE) {
    return res.status(500).json({ error: "Post-match chat table is not configured" });
  }

  const { matchId } = req.params;
  const { endTime } = req.body || {};
  const nowIso = new Date().toISOString();

  try {
    const [matchResp, existingChatResp] = await Promise.all([
      docClient.send(new GetCommand({ TableName: MATCHES_TABLE, Key: { matchId } })),
      docClient.send(
        new QueryCommand({
          TableName: POST_MATCH_CHATS_TABLE,
          IndexName: "MatchIdIndex",
          KeyConditionExpression: "match_id = :matchId",
          ExpressionAttributeValues: { ":matchId": matchId },
          Limit: 1,
        })
      ),
    ]);

    if (!matchResp.Item) {
      return res.status(404).json({ error: "Match not found" });
    }

    if (existingChatResp.Count > 0 && existingChatResp.Items?.length) {
      return res.status(200).json({
        alreadyExists: true,
        chat: mapChatResponse(existingChatResp.Items[0], matchResp.Item),
        participantCount: existingChatResp.Items[0].participant_count || 0,
      });
    }

    const chatId = `pmc_${matchId}_${Date.now()}`;
    let scheduledEndTime = endTime;
    if (!scheduledEndTime) {
      const base = matchResp.Item?.date ? new Date(matchResp.Item.date) : new Date();
      base.setHours(23, 59, 59, 999);
      scheduledEndTime = base.toISOString();
    }

    const checkinsResp = await docClient.send(
      new QueryCommand({
        TableName: CHECKINS_TABLE,
        KeyConditionExpression: "matchId = :matchId",
        ExpressionAttributeValues: { ":matchId": matchId },
      })
    );

    const participantIds = (checkinsResp.Items || []).map((item) => item.userId).filter(Boolean);
    const chatItem = {
      chat_id: chatId,
      match_id: matchId,
      opponent: matchResp.Item.opponent,
      venue: matchResp.Item.venue,
      start_time: nowIso,
      end_time: scheduledEndTime,
      is_closed: false,
      participant_count: participantIds.length,
      created_at: nowIso,
      updated_at: nowIso,
    };

    await docClient.send(new PutCommand({ TableName: POST_MATCH_CHATS_TABLE, Item: chatItem }));

    for (const participantId of participantIds) {
      await docClient.send(
        new PutCommand({
          TableName: CHAT_PARTICIPANTS_TABLE,
          Item: {
            chat_id: chatId,
            user_id: participantId,
            joined_at: nowIso,
            last_read_at: null,
          },
        })
      );
    }

    const userMap = await batchGetUsersByIds(participantIds);
    const participants = participantIds.map((id) => ({
      userId: id,
      nickname: userMap[id]?.nickname || userMap[id]?.name || id,
    }));

    res.status(201).json({
      chat: mapChatResponse(chatItem, matchResp.Item),
      participants,
      participantCount: participantIds.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create post-match chat" });
  }
});

app.post("/post-match-chats/:chatId/close", requireSystemAuth, async (req, res) => {
  if (!POST_MATCH_CHATS_TABLE) {
    return res.status(500).json({ error: "Post-match chat table is not configured" });
  }

  const { chatId } = req.params;

  try {
    const existing = await docClient.send(
      new GetCommand({ TableName: POST_MATCH_CHATS_TABLE, Key: { chat_id: chatId } })
    );
    if (!existing.Item) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (existing.Item.is_closed) {
      return res.json({
        success: true,
        chat: {
          chatId,
          isClosed: true,
          closedAt: existing.Item.closed_at || existing.Item.updated_at || existing.Item.end_time,
        },
      });
    }

    const closedAt = new Date().toISOString();
    const updated = await docClient.send(
      new UpdateCommand({
        TableName: POST_MATCH_CHATS_TABLE,
        Key: { chat_id: chatId },
        UpdateExpression: "SET is_closed = :true, closed_at = :closedAt, updated_at = :closedAt",
        ExpressionAttributeValues: {
          ":true": true,
          ":closedAt": closedAt,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    res.json({
      success: true,
      chat: {
        chatId,
        isClosed: true,
        closedAt: updated.Attributes?.closed_at || closedAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not close chat" });
  }
});

app.post("/post-match-chats/:chatId/notify", requireSystemAuth, async (req, res) => {
  if (!CHAT_PARTICIPANTS_TABLE) {
    return res.status(500).json({ error: "Chat participants table is not configured" });
  }

  const { chatId } = req.params;
  const { type = "chat_opened", message = "ギラ飲みチャットが開設されました！" } = req.body || {};

  try {
    const participantsResp = await docClient.send(
      new QueryCommand({
        TableName: CHAT_PARTICIPANTS_TABLE,
        KeyConditionExpression: "chat_id = :chatId",
        ExpressionAttributeValues: { ":chatId": chatId },
      })
    );

    const participants = participantsResp.Items || [];
    if (!participants.length) {
      return res.status(404).json({ error: "No participants found for this chat" });
    }

    const userIds = participants.map((item) => item.user_id);
    const userMap = await batchGetUsersByIds(userIds);

    const recipients = participants.map((item) => ({
      userId: item.user_id,
      nickname: userMap[item.user_id]?.nickname || userMap[item.user_id]?.name || item.user_id,
      lastReadAt: item.last_read_at || null,
      joinedAt: item.joined_at,
    }));

    res.json({
      success: true,
      type,
      message,
      notifiedUsers: recipients.length,
      recipients,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not send notifications" });
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
    if (Item) {
      // パスワードハッシュは除外
      const { passwordHash, ...sanitized } = Item;
      res.json(sanitized);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not retrieve user" });
  }
});

// ユーザープロフィール更新
app.put("/users/:userId", requireAuth, async (req, res) => {
  const userId = req.params.userId;
  const requestUserId = req.user?.sub;

  // 自分のプロフィールのみ更新可能
  if (userId !== requestUserId) {
    return res.status(403).json({ error: "Forbidden: You can only update your own profile" });
  }

  const { name, nickname, birthDate, gender, icon, style, seat } = req.body || {};

  try {
    const { Item } = await docClient.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
    );

    if (!Item) return res.status(404).json({ error: "User not found" });

    const updated = {
      ...Item,
      name: name !== undefined ? name : Item.name,
      nickname: nickname !== undefined ? nickname : Item.nickname,
      birthDate: birthDate !== undefined ? birthDate : Item.birthDate,
      gender: gender !== undefined ? gender : Item.gender,
      icon: icon !== undefined ? icon : Item.icon,
      style: style !== undefined ? style : Item.style,
      seat: seat !== undefined ? seat : Item.seat,
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: updated }));

    const { passwordHash, ...sanitized } = updated;
    res.json(sanitized);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update user profile" });
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
  const { name, nickname, birthDate, gender, icon, style, seat, trustScore } = req.body || {};

  try {
    const { Item } = await docClient.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
    );

    if (!Item) return res.status(404).json({ error: "User not found" });

    const updated = {
      ...Item,
      name: name !== undefined ? name : Item.name,
      nickname: nickname !== undefined ? nickname : Item.nickname,
      birthDate: birthDate !== undefined ? birthDate : Item.birthDate,
      gender: gender !== undefined ? gender : Item.gender,
      icon: icon !== undefined ? icon : Item.icon,
      style: style !== undefined ? style : Item.style,
      seat: seat !== undefined ? seat : Item.seat,
      trustScore: trustScore !== undefined ? trustScore : Item.trustScore,
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
