const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { app } = require("./handler");
const bcrypt = require("bcryptjs");

const port = 4000;

const USERS_TABLE = process.env.USERS_TABLE || "users-table-dev";
const MATCHES_TABLE = process.env.MATCHES_TABLE || "matches-table-dev";
const CHATS_TABLE = process.env.CHATS_TABLE || "chats-table-dev";
const MESSAGES_TABLE = process.env.MESSAGES_TABLE || "messages-table-dev";
const CHECKINS_TABLE = process.env.CHECKINS_TABLE || "checkins-table-dev";
const REVIEWS_TABLE = process.env.REVIEWS_TABLE || "reviews-table-dev";
const REPORTS_TABLE = process.env.REPORTS_TABLE || "reports-table-dev";
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

async function ensureTable({ tableName, keySchema, attributeDefinitions }) {
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

  // Always ensure local admin account exists with known password
  try {
    const { Item: adminItem } = await doc.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId: "admin" } })
    );
    const ensuredAdmin = {
      userId: "admin",
      name: adminItem?.name || "管理者",
      passwordHash: bcrypt.hashSync("admin1234", 10),
      isAdmin: true,
      createdAt: adminItem?.createdAt || new Date().toISOString(),
      // keep existing flags if present
      suspended: adminItem?.suspended || false,
      deleted: adminItem?.deleted || false,
    };
    await doc.send(new PutCommand({ TableName: USERS_TABLE, Item: ensuredAdmin }));
    console.log("🔐 Ensured local admin account (admin/admin1234)");
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
  }
  app.listen(port, () => {
    console.log(`🚀 Local API running at http://localhost:${port}`);
  });
})();
