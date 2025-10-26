/**
 * 既存ユーザーに誕生日を追加するマイグレーションスクリプト
 *
 * 実行方法:
 * cd hakkutsu-api
 * node scripts/add-birthdate-to-users.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// DynamoDB クライアントの設定
const client = new DynamoDBClient({
  region: 'ap-northeast-1',
  endpoint: 'http://localhost:8000', // ローカル環境用
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE || 'users-table-dev';

// ランダムな誕生日を生成（18歳〜65歳の範囲）
function generateRandomBirthDate() {
  const today = new Date();
  const minAge = 18;
  const maxAge = 65;

  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const birthYear = today.getFullYear() - age;

  // 月と日をランダムに生成
  const month = Math.floor(Math.random() * 12) + 1;
  const daysInMonth = new Date(birthYear, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;

  // YYYY-MM-DD形式で返す
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');

  return `${birthYear}-${monthStr}-${dayStr}`;
}

async function addBirthDateToUsers() {
  try {
    console.log('🔄 既存ユーザーに誕生日を追加します...\n');

    // 1. 全ユーザーを取得
    console.log('📋 ユーザー一覧を取得中...');
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: USERS_TABLE,
      })
    );

    const users = scanResult.Items || [];
    console.log(`  ✅ ${users.length}人のユーザーを取得しました\n`);

    if (users.length === 0) {
      console.log('⚠️  ユーザーが存在しません');
      return;
    }

    // 2. 誕生日がないユーザーに追加
    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      if (user.birthDate) {
        console.log(`  ⏭️  ${user.userId || user.name}: すでに誕生日が設定されています (${user.birthDate})`);
        skippedCount++;
        continue;
      }

      const birthDate = generateRandomBirthDate();

      await docClient.send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { userId: user.userId },
          UpdateExpression: 'SET birthDate = :birthDate',
          ExpressionAttributeValues: {
            ':birthDate': birthDate,
          },
        })
      );

      console.log(`  ✅ ${user.userId || user.name}: 誕生日を追加しました (${birthDate})`);
      updatedCount++;
    }

    console.log('\n✨ マイグレーション完了！\n');
    console.log('📊 結果:');
    console.log(`  - 更新したユーザー: ${updatedCount}人`);
    console.log(`  - スキップしたユーザー: ${skippedCount}人`);
    console.log(`  - 合計: ${users.length}人\n`);

    if (updatedCount > 0) {
      console.log('🎉 すべてのユーザーに誕生日が追加されました！');
      console.log('   アプリで年齢フィルタと年齢表示が使えるようになります。\n');
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
addBirthDateToUsers();
