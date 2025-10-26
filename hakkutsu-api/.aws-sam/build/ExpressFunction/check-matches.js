const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'ap-northeast-1',
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
});
const doc = DynamoDBDocumentClient.from(client);

(async () => {
  const result = await doc.send(new ScanCommand({ TableName: 'matches-table-dev' }));
  console.log('Matches:', result.Count);
  result.Items.forEach(item => {
    console.log('  -', item.matchId, item.homeTeam, 'vs', item.awayTeam, item.date);
  });
})();
