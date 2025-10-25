// Seed initial data (matches, optional users) from seeds/data.json
// Usage examples:
//   USERS_TABLE=users-table-dev MATCHES_TABLE=matches-table-dev node scripts/seed-data.js
//   DYNAMODB_LOCAL_URL=http://localhost:8000 USERS_TABLE=users-table-dev MATCHES_TABLE=matches-table-dev node scripts/seed-data.js

const fs = require("fs");
const path = require("path");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const USERS_TABLE = process.env.USERS_TABLE;
const MATCHES_TABLE = process.env.MATCHES_TABLE;
if (!USERS_TABLE && !MATCHES_TABLE) {
  console.error("USERS_TABLE or MATCHES_TABLE must be provided via env");
  process.exit(1);
}

const region = process.env.AWS_REGION || "us-east-1";
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

function loadSeeds() {
  const p = path.join(__dirname, "..", "seeds", "data.json");
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

async function seed() {
  const data = loadSeeds();
  if (MATCHES_TABLE && Array.isArray(data.matches)) {
    for (const m of data.matches) {
      const item = {
        matchId: m.matchId,
        opponent: m.opponent,
        date: m.date,
        time: m.time,
        venue: m.venue,
        status: m.status || "scheduled",
        description: m.description || "",
        createdAt: new Date().toISOString(),
      };
      await doc.send(new PutCommand({ TableName: MATCHES_TABLE, Item: item }));
      console.log(`Put match ${item.matchId}`);
    }
  }

  if (USERS_TABLE && Array.isArray(data.users)) {
    for (const u of data.users) {
      const item = {
        userId: u.userId,
        name: u.name,
        // NOTE: seed-data does not set passwordHash for security; use seed-admin for admin
        isAdmin: !!u.isAdmin,
        createdAt: new Date().toISOString(),
      };
      await doc.send(new PutCommand({ TableName: USERS_TABLE, Item: item }));
      console.log(`Put user ${item.userId}`);
    }
  }
}

(async () => {
  try {
    await seed();
    console.log("Seeding completed.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

