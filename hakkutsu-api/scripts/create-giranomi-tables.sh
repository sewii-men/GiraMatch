#!/bin/bash

# ギラ飲み機能用のDynamoDBテーブルを作成するスクリプト
#
# 実行方法:
# cd hakkutsu-api
# chmod +x scripts/create-giranomi-tables.sh
# ./scripts/create-giranomi-tables.sh

set -e

ENDPOINT="http://localhost:8000"

echo "🚀 ギラ飲み機能用テーブルの作成を開始します..."
echo ""

# 1. Restaurants テーブル
echo "📍 Restaurants テーブルを作成中..."
aws dynamodb create-table \
  --table-name Restaurants \
  --attribute-definitions \
    AttributeName=restaurant_id,AttributeType=S \
    AttributeName=venue,AttributeType=S \
    AttributeName=distance,AttributeType=N \
    AttributeName=name,AttributeType=S \
  --key-schema \
    AttributeName=restaurant_id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "VenueDistanceIndex",
        "KeySchema": [
          {"AttributeName": "venue", "KeyType": "HASH"},
          {"AttributeName": "distance", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "VenueNameIndex",
        "KeySchema": [
          {"AttributeName": "venue", "KeyType": "HASH"},
          {"AttributeName": "name", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url $ENDPOINT \
  > /dev/null 2>&1

echo "  ✅ Restaurants テーブルを作成しました"

# 2. PostMatchChats テーブル
echo "💬 PostMatchChats テーブルを作成中..."
aws dynamodb create-table \
  --table-name PostMatchChats \
  --attribute-definitions \
    AttributeName=chat_id,AttributeType=S \
    AttributeName=match_id,AttributeType=S \
  --key-schema \
    AttributeName=chat_id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "MatchIdIndex",
        "KeySchema": [
          {"AttributeName": "match_id", "KeyType": "HASH"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url $ENDPOINT \
  > /dev/null 2>&1

echo "  ✅ PostMatchChats テーブルを作成しました"

# 3. PostMatchChatMessages テーブル
echo "✉️  PostMatchChatMessages テーブルを作成中..."
aws dynamodb create-table \
  --table-name PostMatchChatMessages \
  --attribute-definitions \
    AttributeName=message_id,AttributeType=S \
    AttributeName=chat_id,AttributeType=S \
    AttributeName=created_at,AttributeType=S \
    AttributeName=user_id,AttributeType=S \
  --key-schema \
    AttributeName=message_id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "ChatIdCreatedAtIndex",
        "KeySchema": [
          {"AttributeName": "chat_id", "KeyType": "HASH"},
          {"AttributeName": "created_at", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "UserIdCreatedAtIndex",
        "KeySchema": [
          {"AttributeName": "user_id", "KeyType": "HASH"},
          {"AttributeName": "created_at", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url $ENDPOINT \
  > /dev/null 2>&1

echo "  ✅ PostMatchChatMessages テーブルを作成しました"

# 4. RestaurantShares テーブル
echo "🏪 RestaurantShares テーブルを作成中..."
aws dynamodb create-table \
  --table-name RestaurantShares \
  --attribute-definitions \
    AttributeName=share_id,AttributeType=S \
    AttributeName=chat_id,AttributeType=S \
    AttributeName=restaurant_id,AttributeType=S \
    AttributeName=created_at,AttributeType=S \
  --key-schema \
    AttributeName=share_id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "ChatIdRestaurantIdIndex",
        "KeySchema": [
          {"AttributeName": "chat_id", "KeyType": "HASH"},
          {"AttributeName": "restaurant_id", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      },
      {
        "IndexName": "RestaurantIdCreatedAtIndex",
        "KeySchema": [
          {"AttributeName": "restaurant_id", "KeyType": "HASH"},
          {"AttributeName": "created_at", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
      }
    ]' \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url $ENDPOINT \
  > /dev/null 2>&1

echo "  ✅ RestaurantShares テーブルを作成しました"

echo ""
echo "✨ すべてのテーブルの作成が完了しました！"
echo ""
echo "📋 作成されたテーブル:"
aws dynamodb list-tables --endpoint-url $ENDPOINT | grep -E "(Restaurants|PostMatchChats|PostMatchChatMessages|RestaurantShares)"

echo ""
echo "次のステップ:"
echo "  1. サンプルデータを投入: node scripts/seed-giranomi-data.js"
echo "  2. フロントエンドで確認: http://localhost:3000/dashboard"
echo ""
