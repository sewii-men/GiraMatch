
console.log("<<<<< handler.js module loaded >>>>>");
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

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, "").toLowerCase())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes("*")) return callback(null, true);
      if (!origin) return callback(null, true);
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

// ========== HELPER FUNCTIONS ==========

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

// ========== MIDDLEWARE ==========

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
function requireAuth(req, res, next) {
  try {
    const h = req.headers["authorization"] || req.headers["Authorization"];
    if (!h || typeof h !== "string" || !h.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const token = h.slice("Bearer ".length).trim();
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { userId: payload.sub, name: payload.name };
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// ========== ROUTES ==========

app.get("/", (req, res) => {
  res.json({ message: "Hello from Express on AWS Lambda with CORS!" });
});

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

// ========== AUTH ROUTES ==========

app.post("/auth/register", async (req, res) => {
  try {
    const { userId, name, password, birthDate } = req.body;

    // Validation
    if (!userId || !name || !password || !birthDate) {
      return res.status(400).json({ error: "すべての項目を入力してください" });
    }

    const idOk = /^[a-zA-Z0-9_-]{3,30}$/.test(userId.trim());
    if (!idOk) {
      return res.status(400).json({ error: "ユーザーIDは3〜30文字、英数字・_・-のみ利用できます" });
    }

    const nameTrim = name.trim();
    if (nameTrim.length < 1 || nameTrim.length > 50) {
      return res.status(400).json({ error: "表示名は1〜50文字で入力してください" });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ error: "パスワードは8〜72文字で入力してください" });
    }

    // Check if user already exists
    const existingUser = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: userId.trim() },
      })
    );

    if (existingUser.Item) {
      return res.status(409).json({ error: "このユーザーIDは既に使用されています" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
      userId: userId.trim(),
      name: nameTrim,
      passwordHash,
      birthDate,
      isAdmin: false,
      suspended: false,
      deleted: false,
      createdAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: newUser,
      })
    );

    // Generate JWT token
    const token = jwt.sign(
      { sub: newUser.userId, name: newUser.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        userId: newUser.userId,
        name: newUser.name,
        birthDate: newUser.birthDate,
        isAdmin: newUser.isAdmin,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "登録に失敗しました" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { userId, password } = req.body;

    // Validation
    if (!userId || !password) {
      return res.status(400).json({ error: "ユーザーIDとパスワードを入力してください" });
    }

    // Get user
    const result = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: userId.trim() },
      })
    );

    const user = result.Item;

    if (!user) {
      return res.status(401).json({ error: "ユーザーIDまたはパスワードが正しくありません" });
    }

    // Check if user is suspended or deleted
    if (user.suspended) {
      return res.status(403).json({ error: "このアカウントは停止されています" });
    }

    if (user.deleted) {
      return res.status(403).json({ error: "このアカウントは削除されています" });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "ユーザーIDまたはパスワードが正しくありません" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { sub: user.userId, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        birthDate: user.birthDate,
        isAdmin: user.isAdmin || false,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "ログインに失敗しました" });
  }
});

// ========== EXPORTS ==========

module.exports.handler = serverless(app);
module.exports.app = app;
