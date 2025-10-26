// Seed test users with full profile data
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
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

async function createUser(userData) {
    const userId = generateUserId();
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const item = {
        userId,
        email: userData.email.toLowerCase(),
        name: userData.name,
        nickname: userData.nickname,
        passwordHash,
        isAdmin: false,
        birthDate: userData.birthDate,
        gender: userData.gender,
        icon: userData.icon,
        style: userData.style,
        seat: userData.seat,
        trustScore: userData.trustScore || 0,
        createdAt: new Date().toISOString(),
        suspended: false,
        deleted: false,
    };

    await doc.send(new PutCommand({ TableName: USERS_TABLE, Item: item }));
    console.log(`Created user: ${userData.email} (${userData.nickname})`);
    return item;
}

(async () => {
    try {
        const testUsers = [
            {
                email: "taro@test.com",
                password: "password123",
                name: "山田太郎",
                nickname: "たろう",
                birthDate: "1990-05-15",
                gender: "male",
                icon: "⚽",
                style: "声出し応援OK",
                seat: "ゴール裏希望",
                trustScore: 4.5,
            },
            {
                email: "hanako@test.com",
                password: "password123",
                name: "佐藤花子",
                nickname: "はなこ",
                birthDate: "1992-08-20",
                gender: "female",
                icon: "🌸",
                style: "静かに観戦",
                seat: "メインスタンド希望",
                trustScore: 4.8,
            },
            {
                email: "jiro@test.com",
                password: "password123",
                name: "田中次郎",
                nickname: "じろう",
                birthDate: "1988-03-10",
                gender: "male",
                icon: "🎉",
                style: "初心者歓迎",
                seat: "ゴール裏希望",
                trustScore: 4.2,
            },
        ];

        for (const userData of testUsers) {
            await createUser(userData);
        }

        console.log("\nTest users created successfully!");
        console.log("You can now login with:");
        console.log("- taro@test.com / password123");
        console.log("- hanako@test.com / password123");
        console.log("- jiro@test.com / password123");
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
