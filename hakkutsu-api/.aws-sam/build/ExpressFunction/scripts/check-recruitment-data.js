/**
 * 募集データの内容を確認するスクリプト
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: 'ap-northeast-1',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

const RECRUITMENTS_TABLE = process.env.RECRUITMENTS_TABLE || 'recruitments-table-dev';

async function checkRecruitmentData() {
  try {
    console.log('📋 募集データを確認します...\n');

    const result = await docClient.send(
      new ScanCommand({
        TableName: RECRUITMENTS_TABLE,
      })
    );

    const recruitments = result.Items || [];
    console.log(`✅ ${recruitments.length}件の募集を取得しました\n`);

    if (recruitments.length > 0) {
      console.log('最初の募集データの詳細:');
      console.log(JSON.stringify(recruitments[0], null, 2));
    }
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkRecruitmentData();
