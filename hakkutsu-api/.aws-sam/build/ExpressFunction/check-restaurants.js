const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'ap-northeast-1',
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
});
const doc = DynamoDBDocumentClient.from(client);

(async () => {
  const result = await doc.send(new ScanCommand({ TableName: 'restaurants-table-dev' }));
  console.log('Restaurants:', result.Count);
  result.Items.forEach(item => {
    console.log('\n---');
    console.log('ID:', item.restaurant_id);
    console.log('Name:', item.name);
    console.log('Address:', item.address);
    console.log('Image URL:', item.image_url);
    console.log('Google Map URL:', item.google_map_url);
  });
})();
