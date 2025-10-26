const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'ap-northeast-1',
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
});
const doc = DynamoDBDocumentClient.from(client);

(async () => {
  // Create post-match chat for test_match_001
  await doc.send(new PutCommand({
    TableName: 'post-match-chats-table-dev',
    Item: {
      chat_id: 'chat_test_match_001',
      match_id: 'test_match_001',
      opponent: 'ギラヴァンツ北九州 vs テストチーム',
      date: '2025-10-26',
      start_time: '19:00',
      end_time: '23:59',
      is_closed: false,
      participant_count: 0,
      created_at: new Date().toISOString(),
    }
  }));
  console.log('✅ Created post-match chat for test_match_001');

  // Get all users and add them as participants
  const usersResult = await doc.send(new ScanCommand({ TableName: 'users-table-dev' }));
  console.log(`Found ${usersResult.Count} users`);

  for (const user of usersResult.Items) {
    try {
      await doc.send(new PutCommand({
        TableName: 'chat-participants-table-dev',
        Item: {
          chat_id: 'chat_test_match_001',
          user_id: user.userId,
          joined_at: new Date().toISOString(),
          last_read_at: null,
        }
      }));
      console.log(`✅ Added ${user.userId} to chat`);
    } catch (e) {
      console.log(`⚠️ ${user.userId} may already be in chat`);
    }
  }

  console.log('\n✅ All done!');
})();
