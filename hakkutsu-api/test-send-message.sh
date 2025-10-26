#!/bin/bash

# Login to get token
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user_001","password":"password123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"
echo ""

# Send message with restaurant
curl -X POST http://localhost:4000/post-match-chats/chat_test_match_001/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "text": "テストメッセージ with restaurant",
    "restaurant": {
      "restaurantId": "rest_001",
      "name": "居酒屋 ギラ",
      "address": "福岡県北九州市小倉北区浅野3-8-1",
      "imageUrl": "https://placehold.co/300x200/yellow/black?text=Izakaya+Gira",
      "googleMapUrl": "https://www.google.com/maps/search/?api=1&query=test",
      "latitude": 33.8834,
      "longitude": 130.8751,
      "category": "izakaya"
    }
  }'

echo ""
