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

async function upsertUser({ userId, name, password, isAdmin }) {
  const { Item } = await doc.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId } }));
  const item = {
    userId,
    name: Item?.name || name,
    passwordHash: bcrypt.hashSync(password, 10),
    isAdmin: isAdmin === true,
    createdAt: Item?.createdAt || new Date().toISOString(),
    suspended: Item?.suspended || false,
    deleted: Item?.deleted || false,
  };
  await doc.send(new PutCommand({ TableName: USERS_TABLE, Item: item }));
  console.log(`Ensured user '${userId}' (admin=${item.isAdmin})`);
}

(async () => {
  try {
    await upsertUser({ userId: "admin", name: "管理者", password: "admin1234", isAdmin: true });
    console.log("Done.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
