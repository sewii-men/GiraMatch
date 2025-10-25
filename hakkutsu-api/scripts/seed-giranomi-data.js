/**
 * ギラ飲み機能のサンプルデータをDynamoDBに投入するスクリプト
 *
 * 実行方法:
 * cd hakkutsu-api
 * node scripts/seed-giranomi-data.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

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

// 店舗データ
const restaurants = [
  {
    restaurant_id: 'rest_001',
    venue: 'ミクニワールドスタジアム北九州',
    name: '居酒屋 ギラ',
    address: '福岡県北九州市小倉北区浅野3-8-1',
    latitude: 33.8834,
    longitude: 130.8751,
    category: 'izakaya',
    image_url: 'https://placehold.co/300x200/yellow/black?text=Izakaya+Gira',
    google_map_url: 'https://maps.google.com/?q=33.8834,130.8751',
    distance: 250,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    restaurant_id: 'rest_002',
    venue: 'ミクニワールドスタジアム北九州',
    name: '焼き鳥 北九',
    address: '福岡県北九州市小倉北区浅野2-14-2',
    latitude: 33.8840,
    longitude: 130.8760,
    category: 'izakaya',
    image_url: 'https://placehold.co/300x200/red/white?text=Yakitori+Hokukyu',
    google_map_url: 'https://maps.google.com/?q=33.8840,130.8760',
    distance: 300,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    restaurant_id: 'rest_003',
    venue: 'ミクニワールドスタジアム北九州',
    name: 'スタジアムカフェ',
    address: '福岡県北九州市小倉北区浅野3-9-30',
    latitude: 33.8828,
    longitude: 130.8748,
    category: 'cafe',
    image_url: 'https://placehold.co/300x200/blue/white?text=Stadium+Cafe',
    google_map_url: 'https://maps.google.com/?q=33.8828,130.8748',
    distance: 180,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    restaurant_id: 'rest_004',
    venue: 'ミクニワールドスタジアム北九州',
    name: 'ラーメン ギラ軒',
    address: '福岡県北九州市小倉北区浅野2-10-1',
    latitude: 33.8845,
    longitude: 130.8765,
    category: 'ramen',
    image_url: 'https://placehold.co/300x200/orange/white?text=Ramen+Giraken',
    google_map_url: 'https://maps.google.com/?q=33.8845,130.8765',
    distance: 350,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    restaurant_id: 'rest_005',
    venue: 'ミクニワールドスタジアム北九州',
    name: 'バル デ ギラヴァンツ',
    address: '福岡県北九州市小倉北区浅野3-7-1',
    latitude: 33.8832,
    longitude: 130.8755,
    category: 'other',
    image_url: 'https://placehold.co/300x200/green/white?text=Bar+de+Giravanz',
    google_map_url: 'https://maps.google.com/?q=33.8832,130.8755',
    distance: 220,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// テスト用の試合後チャット
const testPostMatchChat = {
  chat_id: 'pmc_test_001',
  match_id: 'test_match_001',
  start_time: new Date(Date.now() - 3600000).toISOString(), // 1時間前
  end_time: new Date().setHours(23, 59, 59, 999),
  is_closed: false,
  participant_count: 45,
  created_at: new Date(Date.now() - 3600000).toISOString(),
  updated_at: new Date().toISOString(),
};

// テスト用のチャットメッセージ
const getTestMessages = () => {
  const now = Date.now();
  return [
    {
      message_id: 'msg_test_001',
      chat_id: 'pmc_test_001',
      user_id: 'user_001',
      text: '今日の試合最高でした！！',
      created_at: new Date(now - 3600000).toISOString(),
      updated_at: new Date(now - 3600000).toISOString(),
      is_deleted: false,
    },
    {
      message_id: 'msg_test_002',
      chat_id: 'pmc_test_001',
      user_id: 'user_002',
      text: '本当に感動しました！勝ててよかった！',
      created_at: new Date(now - 3500000).toISOString(),
      updated_at: new Date(now - 3500000).toISOString(),
      is_deleted: false,
    },
    {
      message_id: 'msg_test_003',
      chat_id: 'pmc_test_001',
      user_id: 'user_003',
      text: '僕たちはここで飲もうと思っています。今日の試合に感動した人はぜひ！！',
      restaurant_id: 'rest_001',
      created_at: new Date(now - 3000000).toISOString(),
      updated_at: new Date(now - 3000000).toISOString(),
      is_deleted: false,
    },
    {
      message_id: 'msg_test_004',
      chat_id: 'pmc_test_001',
      user_id: 'demo', // 現在のユーザー
      text: 'いいですね！参加したいです！',
      created_at: new Date(now - 2500000).toISOString(),
      updated_at: new Date(now - 2500000).toISOString(),
      is_deleted: false,
    },
    {
      message_id: 'msg_test_005',
      chat_id: 'pmc_test_001',
      user_id: 'user_004',
      text: 'このラーメン屋も美味しいですよ！',
      restaurant_id: 'rest_004',
      created_at: new Date(now - 2000000).toISOString(),
      updated_at: new Date(now - 2000000).toISOString(),
      is_deleted: false,
    },
  ];
};

// 店舗共有履歴
const getRestaurantShares = () => [
  {
    share_id: 'share_test_001',
    chat_id: 'pmc_test_001',
    restaurant_id: 'rest_001',
    message_id: 'msg_test_003',
    user_id: 'user_003',
    created_at: new Date(Date.now() - 3000000).toISOString(),
  },
  {
    share_id: 'share_test_002',
    chat_id: 'pmc_test_001',
    restaurant_id: 'rest_004',
    message_id: 'msg_test_005',
    user_id: 'user_004',
    created_at: new Date(Date.now() - 2000000).toISOString(),
  },
];

async function seedData() {
  try {
    console.log('🌱 ギラ飲みデータの投入を開始します...\n');

    // 1. 店舗データの投入
    console.log('📍 店舗データを投入中...');
    for (const restaurant of restaurants) {
      await docClient.send(
        new PutCommand({
          TableName: 'Restaurants',
          Item: restaurant,
        })
      );
      console.log(`  ✅ ${restaurant.name} を追加しました`);
    }

    // 2. 試合後チャットの投入
    console.log('\n💬 試合後チャットを投入中...');
    await docClient.send(
      new PutCommand({
        TableName: 'PostMatchChats',
        Item: testPostMatchChat,
      })
    );
    console.log('  ✅ テスト用チャットを追加しました');

    // 3. チャットメッセージの投入
    console.log('\n✉️  チャットメッセージを投入中...');
    const messages = getTestMessages();
    for (const message of messages) {
      await docClient.send(
        new PutCommand({
          TableName: 'PostMatchChatMessages',
          Item: message,
        })
      );
      console.log(`  ✅ メッセージを追加しました: "${message.text.substring(0, 30)}..."`);
    }

    // 4. 店舗共有履歴の投入
    console.log('\n🏪 店舗共有履歴を投入中...');
    const shares = getRestaurantShares();
    for (const share of shares) {
      await docClient.send(
        new PutCommand({
          TableName: 'RestaurantShares',
          Item: share,
        })
      );
      const restaurant = restaurants.find((r) => r.restaurant_id === share.restaurant_id);
      console.log(`  ✅ ${restaurant.name} の共有履歴を追加しました`);
    }

    console.log('\n✨ すべてのデータの投入が完了しました！\n');
    console.log('📊 投入されたデータ:');
    console.log(`  - 店舗: ${restaurants.length}件`);
    console.log(`  - チャット: 1件`);
    console.log(`  - メッセージ: ${messages.length}件`);
    console.log(`  - 店舗共有履歴: ${shares.length}件`);
    console.log('\n🎉 テスト画面で確認してください！');
    console.log('   URL: http://localhost:3000/post-match-chat/test_match_001\n');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
seedData();
