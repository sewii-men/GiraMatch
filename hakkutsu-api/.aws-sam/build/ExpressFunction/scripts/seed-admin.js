// Seed admin/demo users into a specified DynamoDB table.
// Usage:
//   USERS_TABLE=users-table-dev node scripts/seed-admin.js
// Requires AWS credentials with PutItem/GetItem permissions on the table.

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const bcrypt = require("bcryptjs");

const USERS_TABLE = process.env.USERS_TABLE;
if (!USERS_TABLE) {
  console.error("USERS_TABLE env is required");
  process.exit(1);
}

const region = process.env.AWS_REGION || "ap-northeast-1";
const endpoint = process.env.DYNAMODB_LOCAL_URL;
const client = new DynamoDBClient(
  endpoint
    ? {
      endpoint,
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy",
      },
    }
    : { region }
);
const doc = DynamoDBDocumentClient.from(client);

function generateUserId() {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function upsertUser({ email, name, password, isAdmin }) {
  // メールアドレスで既存ユーザーを検索
  const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
  const scanResult = await doc.send(new ScanCommand({
    TableName: USERS_TABLE,
    FilterExpression: "email = :email",
    ExpressionAttributeValues: { ":email": email.toLowerCase() }
  }));

  const existingUser = scanResult.Items && scanResult.Items.length > 0 ? scanResult.Items[0] : null;
  const userId = existingUser?.userId || generateUserId();

  const item = {
    userId,
    email: email.toLowerCase(),
    name: existingUser?.name || name,
    passwordHash: bcrypt.hashSync(password, 10),
    isAdmin: isAdmin === true,
    createdAt: existingUser?.createdAt || new Date().toISOString(),
    suspended: existingUser?.suspended || false,
    deleted: existingUser?.deleted || false,
  };
  await doc.send(new PutCommand({ TableName: USERS_TABLE, Item: item }));
  console.log(`Ensured user '${email}' (userId=${userId}, admin=${item.isAdmin})`);
}

(async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@test.com";
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error("ADMIN_PASSWORD env is required to seed admin user");
      process.exit(1);
    }
    await upsertUser({ email: adminEmail, name: "管理者", password: adminPassword, isAdmin: true });
    console.log("Done.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
