/**
 * 既存の募集データに募集者の誕生日を追加するマイグレーションスクリプト
 *
 * 実行方法:
 * cd hakkutsu-api
 * node scripts/update-recruitments-birthdate.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

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
const RECRUITMENTS_TABLE = process.env.RECRUITMENTS_TABLE || 'recruitments-table-dev';

async function updateRecruitmentsBirthDate() {
  try {
    console.log('🔄 既存の募集に募集者の誕生日を追加します...\n');

    // 1. 全募集を取得
    console.log('📋 募集一覧を取得中...');
    const recruitmentResult = await docClient.send(
      new ScanCommand({
        TableName: RECRUITMENTS_TABLE,
      })
    );

    const recruitments = recruitmentResult.Items || [];
    console.log(`  ✅ ${recruitments.length}件の募集を取得しました\n`);

    if (recruitments.length === 0) {
      console.log('⚠️  募集が存在しません');
      return;
    }

    // 2. 各募集の募集者の誕生日を取得して追加
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const recruitment of recruitments) {
      if (recruitment.recruiterBirthDate) {
        console.log(`  ⏭️  募集ID ${recruitment.id}: すでに誕生日が設定されています`);
        skippedCount++;
        continue;
      }

      try {
        // 募集者のユーザー情報を取得
        const userResult = await docClient.send(
          new GetCommand({
            TableName: USERS_TABLE,
            Key: { userId: recruitment.recruiterId },
          })
        );

        if (!userResult.Item) {
          console.log(`  ⚠️  募集ID ${recruitment.id}: ユーザー ${recruitment.recruiterId} が見つかりません`);
          errorCount++;
          continue;
        }

        const user = userResult.Item;

        if (!user.birthDate) {
          console.log(`  ⚠️  募集ID ${recruitment.id}: ユーザー ${recruitment.recruiterId} に誕生日が設定されていません`);
          errorCount++;
          continue;
        }

        // 募集データに誕生日を追加
        await docClient.send(
          new UpdateCommand({
            TableName: RECRUITMENTS_TABLE,
            Key: { id: recruitment.id },
            UpdateExpression: 'SET recruiterBirthDate = :birthDate',
            ExpressionAttributeValues: {
              ':birthDate': user.birthDate,
            },
          })
        );

        console.log(`  ✅ 募集ID ${recruitment.id}: 募集者 ${recruitment.recruiterId} の誕生日を追加しました (${user.birthDate})`);
        updatedCount++;
      } catch (error) {
        console.error(`  ❌ 募集ID ${recruitment.id}: エラーが発生しました`, error.message);
        errorCount++;
      }
    }

    console.log('\n✨ マイグレーション完了！\n');
    console.log('📊 結果:');
    console.log(`  - 更新した募集: ${updatedCount}件`);
    console.log(`  - スキップした募集: ${skippedCount}件`);
    console.log(`  - エラー: ${errorCount}件`);
    console.log(`  - 合計: ${recruitments.length}件\n`);

    if (updatedCount > 0) {
      console.log('🎉 募集データが更新されました！');
      console.log('   募集一覧で募集者の年齢が表示されるようになります。\n');
    }

    if (errorCount > 0) {
      console.log('⚠️  一部の募集でエラーが発生しました。');
      console.log('   先に add-birthdate-to-users.js を実行してください。\n');
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
updateRecruitmentsBirthDate();
