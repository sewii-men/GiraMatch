// hakkutsu-api/scripts/migrate-users-to-email.js
// 既存のユーザーデータにemailフィールドを追加するマイグレーションスクリプト

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const USERS_TABLE = process.env.USERS_TABLE || "users-table-dev";
const DYNAMODB_LOCAL_URL = process.env.DYNAMODB_LOCAL_URL;

const client = new DynamoDBClient(
    DYNAMODB_LOCAL_URL
        ? {
            endpoint: DYNAMODB_LOCAL_URL,
            region: process.env.AWS_REGION || "ap-northeast-1",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy",
            },
        }
        : {}
);

const docClient = DynamoDBDocumentClient.from(client);

async function migrateUsers() {
    console.log("🔄 ユーザーデータのマイグレーションを開始します...");
    console.log(`📊 テーブル: ${USERS_TABLE}`);

    try {
        // 全ユーザーを取得
        const scanResult = await docClient.send(
            new ScanCommand({ TableName: USERS_TABLE })
        );

        const users = scanResult.Items || [];
        console.log(`👥 ${users.length}件のユーザーが見つかりました`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            // 既にemailフィールドがある場合はスキップ
            if (user.email) {
                console.log(`⏭️  スキップ: ${user.userId} (既にemailあり: ${user.email})`);
                skippedCount++;
                continue;
            }

            // userIdがメールアドレス形式の場合はそのまま使用
            // そうでない場合は仮のメールアドレスを生成
            let email;
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.userId)) {
                email = user.userId.toLowerCase();
            } else {
                email = `${user.userId}@migrated.local`;
            }

            // ユーザーデータを更新
            const updatedUser = {
                ...user,
                email: email,
            };

            await docClient.send(
                new PutCommand({
                    TableName: USERS_TABLE,
                    Item: updatedUser,
                })
            );

            console.log(`✅ 更新: ${user.userId} → email: ${email}`);
            migratedCount++;
        }

        console.log("\n📊 マイグレーション完了:");
        console.log(`  ✅ 更新: ${migratedCount}件`);
        console.log(`  ⏭️  スキップ: ${skippedCount}件`);
        console.log(`  📊 合計: ${users.length}件`);
    } catch (error) {
        console.error("❌ マイグレーションエラー:", error);
        process.exit(1);
    }
}

migrateUsers();
