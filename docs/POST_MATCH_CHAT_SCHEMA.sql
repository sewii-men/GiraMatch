-- ギラ飲み機能向け リレーショナルスキーマ定義
-- Aurora MySQL 互換を想定

-- 店舗情報テーブル
CREATE TABLE restaurants (
  restaurant_id VARCHAR(50) PRIMARY KEY,
  venue_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(200),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  category VARCHAR(50),
  image_url TEXT,
  google_map_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 試合後チャットテーブル
CREATE TABLE post_match_chats (
  chat_id VARCHAR(50) PRIMARY KEY,
  match_id VARCHAR(50) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(match_id)
);

-- チャットメッセージテーブル
CREATE TABLE chat_messages (
  message_id VARCHAR(50) PRIMARY KEY,
  chat_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  restaurant_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (chat_id) REFERENCES post_match_chats(chat_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id)
);

-- 店舗共有履歴テーブル
CREATE TABLE restaurant_shares (
  share_id VARCHAR(50) PRIMARY KEY,
  chat_id VARCHAR(50) NOT NULL,
  restaurant_id VARCHAR(50) NOT NULL,
  message_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES post_match_chats(chat_id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id),
  FOREIGN KEY (message_id) REFERENCES chat_messages(message_id)
);

-- チャット参加者テーブル
CREATE TABLE chat_participants (
  participant_id VARCHAR(50) PRIMARY KEY,
  chat_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP NULL,
  FOREIGN KEY (chat_id) REFERENCES post_match_chats(chat_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- インデックス
CREATE INDEX idx_restaurants_venue ON restaurants(venue_id);
CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_restaurant_shares_chat ON restaurant_shares(chat_id, restaurant_id);
CREATE INDEX idx_chat_participants_chat ON chat_participants(chat_id);
