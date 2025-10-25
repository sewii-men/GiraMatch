const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { app } = require("./handler");
const bcrypt = require("bcryptjs");

const port = 4000;

const USERS_TABLE = process.env.USERS_TABLE || "users-table-dev";
const MATCHES_TABLE = process.env.MATCHES_TABLE || "matches-table-dev";
const CHATS_TABLE = process.env.CHATS_TABLE || "chats-table-dev";
const MESSAGES_TABLE = process.env.MESSAGES_TABLE || "messages-table-dev";
const CHECKINS_TABLE = process.env.CHECKINS_TABLE || "checkins-table-dev";
const REVIEWS_TABLE = process.env.REVIEWS_TABLE || "reviews-table-dev";
const isLocal = !!process.env.DYNAMODB_LOCAL_URL;

async function ensureUsersTable() {
  if (!isLocal) return; // Only for local dynamodb

  const client = new DynamoDBClient({
    endpoint: process.env.DYNAMODB_LOCAL_URL,
    region: process.env.AWS_REGION || "us-east-1",
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

async function ensureTable({ tableName, keySchema, attributeDefinitions }) {
  const client = new DynamoDBClient({
    endpoint: process.env.DYNAMODB_LOCAL_URL,
    region: process.env.AWS_REGION || "us-east-1",
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

async function seedDataIfEmpty() {
  const client = new DynamoDBClient({
    endpoint: process.env.DYNAMODB_LOCAL_URL,
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy",
    },
  });
  const doc = DynamoDBDocumentClient.from(client);

  // Seed matches
  const matches = [
    { matchId: "1", date: "2025/03/15 (土)", time: "14:00 キックオフ", opponent: "vs アビスパ福岡", venue: "ミクニワールドスタジアム北九州", status: "募集中", description: "九州ダービー!熱い戦いが期待される一戦です。" },
    { matchId: "2", date: "2025/03/22 (土)", time: "15:00 キックオフ", opponent: "vs V・ファーレン長崎", venue: "ミクニワールドスタジアム北九州", status: "募集中", description: "注目の一戦。" },
    { matchId: "3", date: "2025/04/05 (土)", time: "14:00 キックオフ", opponent: "vs ロアッソ熊本", venue: "ミクニワールドスタジアム北九州", status: "募集中", description: "ホームの声援で勝利を。" },
    { matchId: "4", date: "2025/04/19 (土)", time: "15:00 キックオフ", opponent: "vs サガン鳥栖", venue: "ミクニワールドスタジアム北九州", status: "募集中", description: "白熱の九州対決。" },
  ];
  const existMatches = await doc.send(new ScanCommand({ TableName: MATCHES_TABLE }));
  if ((existMatches.Items || []).length === 0) {
    for (const m of matches) await doc.send(new PutCommand({ TableName: MATCHES_TABLE, Item: m }));
    console.log("🌱 Seeded Matches");
  }

  // Seed users (candidates)
  const existingUsers = await doc.send(new ScanCommand({ TableName: USERS_TABLE }));
  if ((existingUsers.Items || []).length === 0) {
    const users = [
      { userId: "demo", name: "Demo User", passwordHash: bcrypt.hashSync("demo1234", 10) },
      {
        userId: "partner1",
        name: "サッカー太郎",
        nickname: "サッカー太郎",
        icon: "⚽",
        style: "声出し応援",
        seat: "ゴール裏",
        trustScore: 4.8,
        matchRate: 95,
        bio: "毎試合欠かさず応援しています!",
        isCandidate: true,
      },
      {
        userId: "partner2",
        name: "応援花子",
        nickname: "応援花子",
        icon: "🎺",
        style: "声出し応援",
        seat: "ゴール裏",
        trustScore: 4.6,
        matchRate: 88,
        bio: "一緒に盛り上がりましょう!",
        isCandidate: true,
      },
      {
        userId: "partner3",
        name: "ギラサポ次郎",
        nickname: "ギラサポ次郎",
        icon: "🔥",
        style: "声出し応援",
        seat: "ゴール裏",
        trustScore: 4.9,
        matchRate: 92,
        bio: "熱く応援したい方歓迎!",
        isCandidate: true,
      },
    ];
    for (const u of users) await doc.send(new PutCommand({ TableName: USERS_TABLE, Item: u }));
    console.log("🌱 Seeded Users");
  }

  // Seed chats and messages
  const chats = [
    { chatId: "1", matchId: "1", participants: ["demo", "partner1"], partner: { id: "partner1", name: "サッカー太郎", icon: "⚽" } },
    { chatId: "2", matchId: "2", participants: ["demo", "partner2"], partner: { id: "partner2", name: "応援花子", icon: "🎺" } },
    { chatId: "3", matchId: "3", participants: ["demo", "partner3"], partner: { id: "partner3", name: "ギラサポ次郎", icon: "🔥" } },
  ];
  const existChats = await doc.send(new ScanCommand({ TableName: CHATS_TABLE }));
  if ((existChats.Items || []).length === 0) {
    for (const c of chats) await doc.send(new PutCommand({ TableName: CHATS_TABLE, Item: c }));
    console.log("🌱 Seeded Chats");
  }

  const initialMessages = [
    { chatId: "1", messageId: "1", senderId: "partner1", text: "はじめまして!一緒に観戦できるの楽しみです!", createdAt: new Date().toISOString() },
    { chatId: "1", messageId: "2", senderId: "demo", text: "こちらこそよろしくお願いします!", createdAt: new Date().toISOString() },
    { chatId: "1", messageId: "3", senderId: "partner1", text: "待ち合わせ場所はどこがいいですか?", createdAt: new Date().toISOString() },
  ];
  const existMsgs = await doc.send(new ScanCommand({ TableName: MESSAGES_TABLE }));
  if ((existMsgs.Items || []).length === 0) {
    for (const m of initialMessages) await doc.send(new PutCommand({ TableName: MESSAGES_TABLE, Item: m }));
    console.log("🌱 Seeded Messages");
  }
}

(async () => {
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
    await seedDataIfEmpty();
  }
  app.listen(port, () => {
    console.log(`🚀 Local API running at http://localhost:${port}`);
  });
})();
