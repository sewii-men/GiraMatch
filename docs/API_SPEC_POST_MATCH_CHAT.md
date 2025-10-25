# ギラ飲み機能 API仕様書

## 概要

試合後の「ギラ飲みチャット」機能で使用するAPIエンドポイントの仕様書。

---

## エンドポイント一覧

### 1. 店舗関連

#### `GET /matches/{matchId}/restaurants`

**概要**: 試合会場近くの店舗一覧を取得

**リクエスト**:
```
GET /matches/match_20250115_001/restaurants
Authorization: Bearer {token}
```

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| category | string | No | 店舗カテゴリ（`izakaya`, `cafe`, `ramen`, `other`） |
| limit | number | No | 取得件数（デフォルト: 20） |

**レスポンス**:
```json
{
  "restaurants": [
    {
      "restaurantId": "rest_001",
      "name": "居酒屋 ギラ",
      "address": "福岡県北九州市小倉北区○○",
      "category": "izakaya",
      "imageUrl": "https://example.com/images/rest_001.jpg",
      "googleMapUrl": "https://maps.google.com/?q=居酒屋ギラ,北九州",
      "latitude": 33.8834,
      "longitude": 130.8751,
      "distance": 250
    }
  ],
  "venue": {
    "venueId": "venue_001",
    "name": "ミクニワールドスタジアム北九州",
    "latitude": 33.8834,
    "longitude": 130.8751
  }
}
```

**エラーレスポンス**:
```json
{
  "error": "Match not found"
}
```

---

### 2. チャット関連

#### `GET /matches/{matchId}/post-match-chat`

**概要**: 試合後のギラ飲みチャット情報を取得

**リクエスト**:
```
GET /matches/match_20250115_001/post-match-chat
Authorization: Bearer {token}
```

**レスポンス**:
```json
{
  "chat": {
    "chatId": "pmc_20250115_001",
    "matchId": "match_20250115_001",
    "opponent": "vs ○○FC",
    "date": "2025-01-15",
    "startTime": "2025-01-15T19:00:00Z",
    "endTime": "2025-01-15T23:59:59Z",
    "isClosed": false,
    "participantCount": 45
  },
  "messages": [
    {
      "messageId": "msg_001",
      "userId": "user_001",
      "nickname": "太郎",
      "icon": "👤",
      "text": "今日の試合最高でした！",
      "restaurant": null,
      "createdAt": "2025-01-15T20:30:00Z",
      "updatedAt": null,
      "isDeleted": false
    },
    {
      "messageId": "msg_002",
      "userId": "user_002",
      "nickname": "花子",
      "icon": "👩",
      "text": "僕たちはここで飲もうと思っています。今日の試合に感動した人はぜひ！！",
      "restaurant": {
        "restaurantId": "rest_001",
        "name": "居酒屋 ギラ",
        "imageUrl": "https://example.com/images/rest_001.jpg",
        "googleMapUrl": "https://maps.google.com/?q=居酒屋ギラ,北九州"
      },
      "createdAt": "2025-01-15T20:35:00Z",
      "updatedAt": null,
      "isDeleted": false
    }
  ],
  "userParticipation": {
    "isParticipant": true,
    "joinedAt": "2025-01-15T20:00:00Z",
    "lastReadAt": "2025-01-15T20:40:00Z"
  }
}
```

**エラーレスポンス**:
```json
{
  "error": "Chat not found or not accessible"
}
```

---

#### `POST /post-match-chats/{chatId}/messages`

**概要**: チャットにメッセージを送信

**リクエスト**:
```
POST /post-match-chats/pmc_20250115_001/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "text": "僕たちはここで飲もうと思っています。今日の試合に感動した人はぜひ！！",
  "restaurantId": "rest_001"
}
```

**リクエストボディ**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| text | string | Yes | メッセージ本文（1〜500文字） |
| restaurantId | string | No | 店舗ID（付与する場合） |

**レスポンス**:
```json
{
  "message": {
    "messageId": "msg_003",
    "userId": "user_001",
    "nickname": "太郎",
    "icon": "👤",
    "text": "僕たちはここで飲もうと思っています。今日の試合に感動した人はぜひ！！",
    "restaurant": {
      "restaurantId": "rest_001",
      "name": "居酒屋 ギラ",
      "imageUrl": "https://example.com/images/rest_001.jpg",
      "googleMapUrl": "https://maps.google.com/?q=居酒屋ギラ,北九州"
    },
    "createdAt": "2025-01-15T20:45:00Z",
    "updatedAt": null,
    "isDeleted": false
  }
}
```

**エラーレスポンス**:
```json
{
  "error": "Chat is closed or you are not a participant"
}
```

---

#### `PUT /post-match-chats/{chatId}/messages/{messageId}`

**概要**: メッセージを編集

**リクエスト**:
```
PUT /post-match-chats/pmc_20250115_001/messages/msg_003
Authorization: Bearer {token}
Content-Type: application/json

{
  "text": "訂正: 僕たちはここで飲みます！"
}
```

**レスポンス**:
```json
{
  "message": {
    "messageId": "msg_003",
    "userId": "user_001",
    "nickname": "太郎",
    "icon": "👤",
    "text": "訂正: 僕たちはここで飲みます！",
    "restaurant": {
      "restaurantId": "rest_001",
      "name": "居酒屋 ギラ",
      "imageUrl": "https://example.com/images/rest_001.jpg",
      "googleMapUrl": "https://maps.google.com/?q=居酒屋ギラ,北九州"
    },
    "createdAt": "2025-01-15T20:45:00Z",
    "updatedAt": "2025-01-15T20:50:00Z",
    "isDeleted": false
  }
}
```

---

#### `DELETE /post-match-chats/{chatId}/messages/{messageId}`

**概要**: メッセージを削除

**リクエスト**:
```
DELETE /post-match-chats/pmc_20250115_001/messages/msg_003
Authorization: Bearer {token}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

---

### 3. 店舗共有状況

#### `GET /post-match-chats/{chatId}/restaurant-shares`

**概要**: チャット内での店舗共有状況を取得（Map表示用）

**リクエスト**:
```
GET /post-match-chats/pmc_20250115_001/restaurant-shares
Authorization: Bearer {token}
```

**レスポンス**:
```json
{
  "shares": [
    {
      "restaurant": {
        "restaurantId": "rest_001",
        "name": "居酒屋 ギラ",
        "latitude": 33.8834,
        "longitude": 130.8751,
        "imageUrl": "https://example.com/images/rest_001.jpg",
        "googleMapUrl": "https://maps.google.com/?q=居酒屋ギラ,北九州"
      },
      "shareCount": 12,
      "lastSharedAt": "2025-01-15T21:00:00Z"
    },
    {
      "restaurant": {
        "restaurantId": "rest_002",
        "name": "焼き鳥 北九",
        "latitude": 33.8840,
        "longitude": 130.8760,
        "imageUrl": "https://example.com/images/rest_002.jpg",
        "googleMapUrl": "https://maps.google.com/?q=焼き鳥北九,北九州"
      },
      "shareCount": 8,
      "lastSharedAt": "2025-01-15T20:55:00Z"
    }
  ],
  "totalShares": 20
}
```

---

### 4. チャット管理（内部API/スケジューラー用）

#### `POST /matches/{matchId}/post-match-chat/create`

**概要**: 試合終了時にチャットを自動作成（EventBridgeから呼ばれる）

**リクエスト**:
```
POST /matches/match_20250115_001/post-match-chat/create
Authorization: Bearer {system-token}
Content-Type: application/json

{
  "endTime": "2025-01-15T23:59:59Z"
}
```

**レスポンス**:
```json
{
  "chat": {
    "chatId": "pmc_20250115_001",
    "matchId": "match_20250115_001",
    "startTime": "2025-01-15T19:00:00Z",
    "endTime": "2025-01-15T23:59:59Z",
    "isClosed": false
  },
  "participants": [
    {
      "userId": "user_001",
      "nickname": "太郎"
    }
  ],
  "participantCount": 45
}
```

---

#### `POST /post-match-chats/{chatId}/close`

**概要**: チャットを閉鎖（EventBridgeから呼ばれる）

**リクエスト**:
```
POST /post-match-chats/pmc_20250115_001/close
Authorization: Bearer {system-token}
```

**レスポンス**:
```json
{
  "success": true,
  "chat": {
    "chatId": "pmc_20250115_001",
    "isClosed": true,
    "closedAt": "2025-01-15T23:59:59Z"
  }
}
```

---

### 5. 通知関連

#### `POST /post-match-chats/{chatId}/notify`

**概要**: チェックイン済みユーザーに通知を送信

**リクエスト**:
```
POST /post-match-chats/pmc_20250115_001/notify
Authorization: Bearer {system-token}
Content-Type: application/json

{
  "type": "chat_opened",
  "message": "ギラ飲みチャットが開設されました！"
}
```

**レスポンス**:
```json
{
  "success": true,
  "notifiedUsers": 45
}
```

---

## WebSocket API（リアルタイム通信）

### 接続

**エンドポイント**: `wss://api.example.com/ws`

**接続時**:
```json
{
  "action": "connect",
  "chatId": "pmc_20250115_001",
  "token": "Bearer {token}"
}
```

### メッセージ受信

**サーバーからクライアント**:
```json
{
  "type": "new_message",
  "data": {
    "messageId": "msg_004",
    "userId": "user_003",
    "nickname": "次郎",
    "icon": "👨",
    "text": "今日の試合最高！",
    "restaurant": null,
    "createdAt": "2025-01-15T21:00:00Z"
  }
}
```

### メッセージ送信

**クライアントからサーバー**:
```json
{
  "action": "sendMessage",
  "chatId": "pmc_20250115_001",
  "text": "僕たちはここで飲もうと思っています！",
  "restaurantId": "rest_001"
}
```

### 切断

```json
{
  "action": "disconnect"
}
```

---

## エラーコード

| ステータスコード | エラーメッセージ | 説明 |
|----------------|----------------|------|
| 400 | Invalid request | リクエストが不正 |
| 401 | Unauthorized | 認証エラー |
| 403 | Forbidden | チャットにアクセスする権限がない |
| 404 | Not found | チャットや店舗が見つからない |
| 410 | Chat is closed | チャットが閉鎖済み |
| 429 | Too many requests | レート制限 |
| 500 | Internal server error | サーバーエラー |

---

## レート制限

- **メッセージ送信**: 1分間に10回まで
- **チャット取得**: 1分間に30回まで
- **店舗取得**: 1分間に20回まで

---

## 注意事項

1. **認証**: すべてのエンドポイントで `Authorization: Bearer {token}` が必要
2. **チェックイン済みユーザーのみ**: チャットへのアクセスはチェックイン済みユーザーに制限
3. **チャット閉鎖**: 23:59に自動的に閉鎖され、以降はメッセージ送信不可（閲覧のみ可能）
4. **メッセージ保存**: 削除されたメッセージもデータベースには `isDeleted=true` として保存
