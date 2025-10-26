// Seed test recruitments
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const RECRUITMENTS_TABLE = process.env.RECRUITMENTS_TABLE;
const MATCHES_TABLE = process.env.MATCHES_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

if (!RECRUITMENTS_TABLE || !MATCHES_TABLE || !USERS_TABLE) {
    console.error("RECRUITMENTS_TABLE, MATCHES_TABLE, and USERS_TABLE env are required");
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

async function createRecruitment(recruitmentData) {
    const recruitmentId = `recruitment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const item = {
        id: recruitmentId,
        matchId: recruitmentData.matchId,
        recruiterId: recruitmentData.recruiterId,
        conditions: recruitmentData.conditions,
        message: recruitmentData.message,
        opponent: recruitmentData.opponent,
        date: recruitmentData.date,
        time: recruitmentData.time,
        venue: recruitmentData.venue,
        recruiterNickname: recruitmentData.recruiterNickname,
        recruiterGender: recruitmentData.recruiterGender,
        recruiterIcon: recruitmentData.recruiterIcon,
        recruiterTrustScore: recruitmentData.recruiterTrustScore,
        recruiterBirthDate: recruitmentData.recruiterBirthDate,
        recruiterStyle: recruitmentData.recruiterStyle,
        recruiterSeat: recruitmentData.recruiterSeat,
        createdAt: new Date().toISOString(),
        status: "active",
    };

    await doc.send(new PutCommand({ TableName: RECRUITMENTS_TABLE, Item: item }));
    console.log(`Created recruitment: ${recruitmentData.opponent} by ${recruitmentData.recruiterNickname}`);
    return item;
}

(async () => {
    try {
        // Get matches
        const matchesData = await doc.send(new ScanCommand({ TableName: MATCHES_TABLE }));
        const matches = matchesData.Items || [];

        if (matches.length === 0) {
            console.error("No matches found. Please run seed-data.js first.");
            process.exit(1);
        }

        // Get users
        const usersData = await doc.send(new ScanCommand({ TableName: USERS_TABLE }));
        const users = (usersData.Items || []).filter(u => !u.isAdmin);

        if (users.length === 0) {
            console.error("No users found. Please run seed-test-users.js first.");
            process.exit(1);
        }

        // Create recruitments
        const match1 = matches[0];
        const match2 = matches[1] || matches[0];

        const user1 = users[0];
        const user2 = users[1] || users[0];

        await createRecruitment({
            matchId: match1.matchId,
            recruiterId: user1.userId,
            conditions: ["声出し応援OK", "ゴール裏希望"],
            message: "一緒に熱く応援しましょう！初心者の方も大歓迎です。",
            opponent: match1.opponent,
            date: match1.date,
            time: match1.time,
            venue: match1.venue,
            recruiterNickname: user1.nickname,
            recruiterGender: user1.gender,
            recruiterIcon: user1.icon,
            recruiterTrustScore: user1.trustScore,
            recruiterBirthDate: user1.birthDate,
            recruiterStyle: user1.style,
            recruiterSeat: user1.seat,
        });

        if (user2.userId !== user1.userId) {
            await createRecruitment({
                matchId: match2.matchId,
                recruiterId: user2.userId,
                conditions: ["静かに観戦", "メインスタンド希望"],
                message: "落ち着いて試合を楽しみたい方、一緒に観戦しませんか？",
                opponent: match2.opponent,
                date: match2.date,
                time: match2.time,
                venue: match2.venue,
                recruiterNickname: user2.nickname,
                recruiterGender: user2.gender,
                recruiterIcon: user2.icon,
                recruiterTrustScore: user2.trustScore,
                recruiterBirthDate: user2.birthDate,
                recruiterStyle: user2.style,
                recruiterSeat: user2.seat,
            });
        }

        console.log("\nTest recruitments created successfully!");
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
