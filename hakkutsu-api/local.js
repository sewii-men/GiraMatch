const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { app } = require("./handler");
console.log("<<<<< app imported in local.js >>>>>", !!app);
const bcrypt = require("bcryptjs");

const MOCK_RESTAURANTS = [
  {
    id: "rest_001",
    name: "居酒屋 ギラ",
    address: "福岡県北九州市小倉北区浅野3-8-1",
    imageUrl: "https://placehold.co/300x200/yellow/black?text=Izakaya+Gira",
    googleMapUrl: "https://maps.google.com/?q=33.8834,130.8751",
    latitude: 33.8834,
    longitude: 130.8751,
    category: "izakaya",
    distance: 250,
  },
  {
    id: "rest_002",
    name: "焼き鳥 北九",
    address: "福岡県北九州市小倉北区浅野2-14-2",
    imageUrl: "https://placehold.co/300x200/red/white?text=Yakitori+Hokukyu",
    googleMapUrl: "https://maps.google.com/?q=33.8840,130.8760",
    latitude: 33.884,
    longitude: 130.876,
    category: "izakaya",
    distance: 300,
  },
  {
    id: "rest_003",
    name: "スタジアムカフェ",
    address: "福岡県北九州市小倉北区浅野3-9-30",
    imageUrl: "https://placehold.co/300x200/blue/white?text=Stadium+Cafe",
    googleMapUrl: "https://maps.google.com/?q=33.8828,130.8748",
    latitude: 33.8828,
    longitude: 130.8748,
    category: "cafe",
    distance: 180,
  },
  {
    id: "rest_004",
    name: "ラーメン ギラ軒",
    address: "福岡県北九州市小倉北区浅野2-10-1",
    imageUrl: "https://placehold.co/300x200/orange/white?text=Ramen+Giraken",
    googleMapUrl: "https://maps.google.com/?q=33.8845,130.8765",
    latitude: 33.8845,
    longitude: 130.8765,
    category: "ramen",
    distance: 350,
  },
  {
    id: "rest_005",
    name: "バル デ ギラヴァンツ",
    address: "福岡県北九州市小倉北区浅野3-7-1",
    imageUrl: "https://placehold.co/300x200/green/white?text=Bar+de+Giravanz",
    googleMapUrl: "https://maps.google.com/?q=33.8832,130.8755",
    latitude: 33.8832,
    longitude: 130.8755,
    category: "other",
    distance: 220,
  },
];


const port = 4000;

const USERS_TABLE = process.env.USERS_TABLE || "users-table-dev";
const MATCHES_TABLE = process.env.MATCHES_TABLE || "matches-table-dev";
const CHATS_TABLE = process.env.CHATS_TABLE || "chats-table-dev";
const MESSAGES_TABLE = process.env.MESSAGES_TABLE || "messages-table-dev";
const CHECKINS_TABLE = process.env.CHECKINS_TABLE || "checkins-table-dev";
const REVIEWS_TABLE = process.env.REVIEWS_TABLE || "reviews-table-dev";
const REPORTS_TABLE = process.env.REPORTS_TABLE || "reports-table-dev";
const RECRUITMENTS_TABLE = process.env.RECRUITMENTS_TABLE || "recruitments-table-dev";
const REQUESTS_TABLE = process.env.REQUESTS_TABLE || "requests-table-dev";
const RESTAURANTS_TABLE = process.env.RESTAURANTS_TABLE || "restaurants-table-dev";
const isLocal = !!process.env.DYNAMODB_LOCAL_URL;

async function ensureUsersTable() {
  if (!isLocal) return; // Only for local dynamodb

  const client = new DynamoDBClient({
    endpoint: process.env.DYNAMODB_LOCAL_URL,
    region: process.env.AWS_REGION || "ap-northeast-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy",
    },
  });

  try {
    await client.send(new DescribeTableCommand({ TableName: USERS_TABLE }));
    console.log(`✅ DynamoDB local: table '${USERS_TABLE}' already exists`);
  } catch (err) {
    if (err && err.name === "ResourceNotFoundException") {
      console.log(`🛠️  Creating DynamoDB local table '${USERS_TABLE}' ...`);
      await client.send(
        new CreateTableCommand({
          TableName: USERS_TABLE,
          AttributeDefinitions: [{ AttributeName: "userId", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
          BillingMode: "PAY_PER_REQUEST",
        })
      );
      // Simple wait loop until active
      let status = "CREATING";
      while (status !== "ACTIVE") {
        await new Promise((r) => setTimeout(r, 750));
        const d = await client.send(new DescribeTableCommand({ TableName: USERS_TABLE }));
        status = d?.Table?.TableStatus || status;
      }
      console.log(`✅ DynamoDB local: table '${USERS_TABLE}' is ACTIVE`);
    } else {
      console.error("Failed to verify/create table", err);
      throw err;
    }
  }
}

async function ensureTable({ tableName, keySchema, attributeDefinitions, globalSecondaryIndexes }) {
  const client = new DynamoDBClient({
    endpoint: process.env.DYNAMODB_LOCAL_URL,
    region: process.env.AWS_REGION || "ap-northeast-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy",
    },
  });
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`✅ DynamoDB local: table '${tableName}' already exists`);
  } catch (err) {
    if (err && err.name === "ResourceNotFoundException") {
      console.log(`🛠️  Creating DynamoDB local table '${tableName}' ...`);
      await client.send(
        new CreateTableCommand({
          TableName: tableName,
          AttributeDefinitions: attributeDefinitions,
          KeySchema: keySchema,
          GlobalSecondaryIndexes: globalSecondaryIndexes,
          BillingMode: "PAY_PER_REQUEST",
        })
      );
      let status = "CREATING";
      while (status !== "ACTIVE") {
        await new Promise((r) => setTimeout(r, 750));
        const d = await client.send(new DescribeTableCommand({ TableName: tableName }));
        status = d?.Table?.TableStatus || status;
      }
      console.log(`✅ DynamoDB local: table '${tableName}' is ACTIVE`);
    } else {
      console.error("Failed to verify/create table", err);
      throw err;
    }
  }
}

async function seedRestaurants() {
  if (!isLocal) return;

  const client = new DynamoDBClient({
    endpoint: process.env.DYNAMODB_LOCAL_URL,
    region: process.env.AWS_REGION || "ap-northeast-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy",
    },
  });
  const doc = DynamoDBDocumentClient.from(client);

  try {
    const { Count } = await doc.send(new ScanCommand({ TableName: RESTAURANTS_TABLE, Select: "COUNT" }));
    if (Count > 0) {
      console.log(`✅ DynamoDB local: table '${RESTAURANTS_TABLE}' already has data. Skipping seed.`);
      return;
    }

    console.log(`🌱 Seeding '${RESTAURANTS_TABLE}' with initial data...`);
    for (const restaurant of MOCK_RESTAURANTS) {
      const item = {
        restaurant_id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        image_url: restaurant.imageUrl,
        google_map_url: restaurant.googleMapUrl,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        category: restaurant.category,
        distance: restaurant.distance,
      };
      await doc.send(new PutCommand({ TableName: RESTAURANTS_TABLE, Item: item }));
    }
    console.log(`✅ DynamoDB local: Seeded ${MOCK_RESTAURANTS.length} restaurants.`);

  } catch (error) {
    console.error(`Error seeding ${RESTAURANTS_TABLE}:`, error);
  }
}


async function ensureLocalAdminOnly() {
  const client = new DynamoDBClient({
    endpoint: process.env.DYNAMODB_LOCAL_URL,
    region: process.env.AWS_REGION || "ap-northeast-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy",
    },
  });
  const doc = DynamoDBDocumentClient.from(client);

  // Always ensure local admin account exists using env credentials
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.warn("⚠️  ADMIN_PASSWORD is not set; skipping local admin ensure");
      return;
    }

    const { Item: adminItem } = await doc.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId: adminEmail } })
    );
    const ensuredAdmin = {
      userId: adminEmail,
      name: adminItem?.name || "管理者",
      passwordHash: bcrypt.hashSync(adminPassword, 10),
      isAdmin: true,
      createdAt: adminItem?.createdAt || new Date().toISOString(),
      // keep existing flags if present
      suspended: adminItem?.suspended || false,
      deleted: adminItem?.deleted || false,
    };
    await doc.send(new PutCommand({ TableName: USERS_TABLE, Item: ensuredAdmin }));
    console.log(`🔐 Ensured local admin account (${adminEmail})`);
  } catch (e) {
    console.warn("⚠️  Failed ensuring local admin account", e?.message || e);
  }
}

(async () => {
  // DynamoDBが起動するまで待機
  if (isLocal) {
    console.log("⏳ Waiting for DynamoDB to be ready...");
    let retries = 30;
    while (retries > 0) {
      try {
        const client = new DynamoDBClient({
          endpoint: process.env.DYNAMODB_LOCAL_URL,
          region: process.env.AWS_REGION || "ap-northeast-1",
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy",
          },
        });
        await client.send(new DescribeTableCommand({ TableName: "any-table" }));
        break; // 接続成功（テーブルが存在しなくてもOK）
      } catch (err) {
        if (err.name === "ResourceNotFoundException") {
          console.log("✅ DynamoDB is ready!");
          break; // DynamoDBは起動している
        }
        retries--;
        if (retries === 0) {
          console.error("❌ Could not connect to DynamoDB after 30 retries");
          process.exit(1);
        }
        console.log(`⏳ DynamoDB not ready, retrying... (${retries} left)`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  await ensureUsersTable();
  if (isLocal) {
    await ensureTable({
      tableName: MATCHES_TABLE,
      attributeDefinitions: [{ AttributeName: "matchId", AttributeType: "S" }],
      keySchema: [{ AttributeName: "matchId", KeyType: "HASH" }],
    });
    await ensureTable({
      tableName: CHATS_TABLE,
      attributeDefinitions: [{ AttributeName: "chatId", AttributeType: "S" }],
      keySchema: [{ AttributeName: "chatId", KeyType: "HASH" }],
    });
    await ensureTable({
      tableName: MESSAGES_TABLE,
      attributeDefinitions: [
        { AttributeName: "chatId", AttributeType: "S" },
        { AttributeName: "messageId", AttributeType: "S" },
      ],
      keySchema: [
        { AttributeName: "chatId", KeyType: "HASH" },
        { AttributeName: "messageId", KeyType: "RANGE" },
      ],
    });
    await ensureTable({
      tableName: CHECKINS_TABLE,
      attributeDefinitions: [
        { AttributeName: "matchId", AttributeType: "S" },
        { AttributeName: "userId", AttributeType: "S" },
      ],
      keySchema: [
        { AttributeName: "matchId", KeyType: "HASH" },
        { AttributeName: "userId", KeyType: "RANGE" },
      ],
    });
    await ensureTable({
      tableName: REVIEWS_TABLE,
      attributeDefinitions: [{ AttributeName: "reviewId", AttributeType: "S" }],
      keySchema: [{ AttributeName: "reviewId", KeyType: "HASH" }],
    });
    await ensureTable({
      tableName: REPORTS_TABLE,
      attributeDefinitions: [{ AttributeName: "reportId", AttributeType: "S" }],
      keySchema: [{ AttributeName: "reportId", KeyType: "HASH" }],
    });
    await ensureLocalAdminOnly();

    await ensureTable({
      tableName: RECRUITMENTS_TABLE,
      attributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "recruiterId", AttributeType: "S" },
      ],
      keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      globalSecondaryIndexes: [
        {
          IndexName: "RecruiterIdIndex",
          KeySchema: [{ AttributeName: "recruiterId", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    });
    await ensureTable({
      tableName: REQUESTS_TABLE,
      attributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "recruiterId", AttributeType: "S" },
        { AttributeName: "requesterId", AttributeType: "S" },
      ],
      keySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      globalSecondaryIndexes: [
        {
          IndexName: "RecruiterIdIndex",
          KeySchema: [{ AttributeName: "recruiterId", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "RequesterIdIndex",
          KeySchema: [{ AttributeName: "requesterId", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    });

    await ensureTable({
      tableName: RESTAURANTS_TABLE,
      attributeDefinitions: [{ AttributeName: "restaurant_id", AttributeType: "S" }],
      keySchema: [{ AttributeName: "restaurant_id", KeyType: "HASH" }],
    });

    await seedRestaurants();
  }
  app.listen(port, () => {
    console.log(`🚀 Local API running at http://localhost:${port}`);
  });
})();
