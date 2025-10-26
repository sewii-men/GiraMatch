const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'ap-northeast-1',
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
});
const doc = DynamoDBDocumentClient.from(client);

(async () => {
  const result = await doc.send(new ScanCommand({ TableName: 'post-match-chats-table-dev' }));
  console.log('Post-match chats:', result.Count);
  result.Items.forEach(item => {
    console.log('  - chatId:', item.chat_id, 'matchId:', item.match_id);
  });
})();
