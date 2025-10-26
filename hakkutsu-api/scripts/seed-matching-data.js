/**
 * マッチング機能のテストデータ投入スクリプト
 * 
 * 実行方法:
 * cd hakkutsu-api
 * node scripts/seed-matching-data.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const STAGE = 'dev';

const client = new DynamoDBClient({
    region: 'ap-northeast-1',
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLES = {
    MATCHES: `matches-table-${STAGE}`,
    CHATS: `chats-table-${STAGE}`,
    MESSAGES: `messages-table-${STAGE}`,
    RECRUITMENTS: `recruitments-table-${STAGE}`,
    REQUESTS: `requests-table-${STAGE}`,
};

// テスト用の試合データ
const testMatches = [
    {
        matchId: 'test_match_001',
        opponent: 'FC東京',
        date: '2025-11-15',
        time: '14:00',
        venue: 'ミクニワールドスタジアム北九州',
        venueId: 'mikuni_stadium',
        latitude: 33.8834,
        longitude: 130.8751,
        status: 'scheduled',
        description: 'J1リーグ 第32節',
        createdAt: new Date().toISOString(),
    },
    {
        matchId: 'test_match_002',
        opponent: '横浜F・マリノス',
        date: '2025-11-22',
        time: '15:00',
        venue: 'ミクニワールドスタジアム北九州',
        venueId: 'mikuni_stadium',
        latitude: 33.8834,
        longitude: 130.8751,
        status: 'scheduled',
        description: 'J1リーグ 第33節',
        createdAt: new Date().toISOString(),
    },
    {
        matchId: 'test_match_003',
        opponent: '鹿島アントラーズ',
        date: '2025-11-29',
        time: '14:00',
        venue: 'ミクニワールドスタジアム北九州',
        venueId: 'mikuni_stadium',
        latitude: 33.8834,
        longitude: 130.8751,
        status: 'scheduled',
        description: 'J1リーグ 第34節',
        createdAt: new Date().toISOString(),
    },
];

// テスト用のチャットデータ
async function getTestChats() {
    try {
        const result = await docClient.send(
            new ScanCommand({
                TableName: `users-table-${STAGE}`,
                Limit: 5,
            })
        );

        const users = result.Items || [];
        if (users.length < 2) {
            console.log('⚠️  ユーザーが不足しています。最低2人のユーザーが必要です。');
            return [];
        }

        const chats = [];
        for (let i = 0; i < Math.min(3, users.length - 1); i++) {
            const chatId = `chat_test_${String(i + 1).padStart(3, '0')}`;
            const user1 = users[i];
            const user2 = users[i + 1];

            chats.push({
                chatId,
                matchId: testMatches[i % testMatches.length].matchId,
                participants: [user1.userId, user2.userId],
                partner: {
                    id: user2.userId,
                    name: user2.nickname || user2.name || user2.userId,
                    icon: user2.icon || '👤',
                },
                createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }

        return chats;
    } catch (error) {
        console.log('⚠️  チャットデータの生成に失敗しました:', error.message);
        return [];
    }
}

// テスト用のメッセージデータ
function getTestMessages(chatId, userId1, userId2) {
    const now = Date.now();
    return [
        {
            chatId,
            messageId: `${now - 3600000}`,
            text: 'こんにちは！一緒に試合を観戦しませんか？',
            senderId: userId1,
            createdAt: new Date(now - 3600000).toISOString(),
        },
        {
            chatId,
            messageId: `${now - 3000000}`,
            text: 'いいですね！よろしくお願いします！',
            senderId: userId2,
            createdAt: new Date(now - 3000000).toISOString(),
        },
        {
            chatId,
            messageId: `${now - 2400000}`,
            text: '小倉駅で待ち合わせしましょうか？',
            senderId: userId1,
            createdAt: new Date(now - 2400000).toISOString(),
        },
        {
            chatId,
            messageId: `${now - 1800000}`,
            text: 'はい、13時でどうですか？',
            senderId: userId2,
            createdAt: new Date(now - 1800000).toISOString(),
        },
    ];
}

async function seedData() {
    try {
        console.log('🌱 マッチング機能のテストデータ投入を開始します...\n');
        console.log(`📍 ステージ: ${STAGE}`);
        console.log(`📍 リージョン: ap-northeast-1\n`);

        // 1. 試合データの投入
        console.log('⚽ 試合データを投入中...');
        for (const match of testMatches) {
            await docClient.send(
                new PutCommand({
                    TableName: TABLES.MATCHES,
                    Item: match,
                })
            );
            console.log(`  ✅ ${match.opponent} 戦を追加しました (${match.date})`);
        }

        // 2. チャットデータの投入
        console.log('\n💬 チャットデータを投入中...');
        const chats = await getTestChats();

        if (chats.length === 0) {
            console.log('  ⚠️  チャットデータをスキップしました（ユーザーが不足）');
        } else {
            for (const chat of chats) {
                await docClient.send(
                    new PutCommand({
                        TableName: TABLES.CHATS,
                        Item: chat,
                    })
                );
                console.log(`  ✅ チャット ${chat.chatId} を追加しました`);

                // メッセージも追加
                const messages = getTestMessages(
                    chat.chatId,
                    chat.participants[0],
                    chat.participants[1]
                );

                for (const message of messages) {
                    await docClient.send(
                        new PutCommand({
                            TableName: TABLES.MESSAGES,
                            Item: message,
                        })
                    );
                }
                console.log(`     └─ メッセージ ${messages.length}件を追加しました`);
            }
        }

        console.log('\n✨ すべてのデータの投入が完了しました！\n');
        console.log('📊 投入されたデータ:');
        console.log(`  - 試合: ${testMatches.length}件`);
        console.log(`  - チャット: ${chats.length}件`);
        console.log(`  - メッセージ: ${chats.length * 4}件`);
        console.log('\n🎉 本番環境で確認してください！\n');
    } catch (error) {
        console.error('❌ エラーが発生しました:', error);
        console.error('詳細:', error.message);
        process.exit(1);
    }
}

seedData();
