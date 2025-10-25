# ギラ飲み機能 実装計画

## 概要

試合観戦後の交流を促進し、地域コミュニティを強化する「ギラ飲み」機能の実装計画。
試合後にチェックイン済みユーザーが参加できるチャットで、近くの居酒屋情報を共有し、Map上で可視化する。

## テスト環境

本番では試合終了後にギラ飲みチャットが自動的に開設されますが、開発・テスト段階では以下の方法でアクセス可能です。

### テストボタンの配置

- **配置場所**: ダッシュボード画面
- **ボタン名**: 「ギラ飲みチャット（テスト）」
- **動作**: クリックすると、ダミー試合のギラ飲みチャット画面に遷移
- **表示条件**: 開発環境のみ（本番環境では非表示）

このテストボタンを使用することで、試合終了を待たずにギラ飲みチャット機能の動作を確認できます。

## 機能要件

### 1. 近くの居酒屋表示
- **表示タイミング**: ダッシュボードでリクエストを承諾し、マッチした場合
- **表示内容**: 会場近くの居酒屋・昼ごはんの店
- **非表示**: 募集や参加希望のフローでは表示しない

### 2. 試合後の「ギラ飲みチャット」
- **参加条件**: チェックイン済みのユーザーのみ
- **開催**: 試合終了後に自動で開設
- **閉鎖**: その日の23:59に自動クローズ
- **履歴**: データベースにチャット履歴を保存

### 3. チャット画面のレイアウト
```
┌─────────────────────────────────────┐
│  ギラ飲みチャット - vs 対戦相手名    │
├──────────────┬──────────────────────┤
│              │                      │
│  店舗リスト  │   チャットエリア     │
│              │                      │
│ [店舗カード1]│  メッセージ1         │
│ [店舗カード2]│  メッセージ2         │
│ [店舗カード3]│  メッセージ3         │
│ [店舗カード4]│                      │
│ [店舗カード5]│  ┌───────────────┐  │
│              │  │入力欄          │  │
│              │  └───────────────┘  │
└──────────────┴──────────────────────┘
```

### 4. 店舗カードの構成
- 店舗画像
- 店舗名
- 「GoogleMapで開く」ボタン
- 「メッセージに付与」ボタン

### 5. メッセージに付与機能
- ボタンを押すと、チャット入力欄に店舗情報（リンク+画像）が追加
- テンプレートメッセージを選択可能（5種類）
  1. 「僕たちはここで飲もうと思っています。今日の試合に感動した人はぜひ！！」
  2. 「この店でギラ飲みしませんか？一緒に今日の試合を振り返りましょう！」
  3. 「ここに向かってます！合流したい人は連絡ください！」
  4. 「この店で乾杯！！今日の勝利を祝いましょう！」
  5. 「今からここで飲みます。誰か来ませんか？」

### 6. Map表示機能
- Google Maps API を使用
- 店舗リンクが送信されるとMap上にギラヴァンツロゴマーカーを表示
- 共有数が多いほどマーカーが大きく/目立つように
- リアルタイムで「誰がどこで飲んでいるか」が可視化

---

## 実装計画（フロントエンド優先）

### Phase 1: UI/UX プロトタイプ作成
**目標**: 画面遷移とデザインを固める

#### 1.1 ギラ飲みチャット画面の作成
- [ ] `/post-match-chat/[matchId]/page.tsx` を作成
- [ ] 2カラムレイアウトの実装（左: 店舗リスト、右: チャット）
- [ ] レスポンシブ対応（モバイルは上下切り替え）

#### 1.2 店舗カードコンポーネントの作成
- [ ] `/components/RestaurantCard.tsx` を作成
  - 店舗画像（ダミー画像使用）
  - 店舗名
  - GoogleMapボタン
  - メッセージに付与ボタン

#### 1.3 チャットコンポーネントの作成
- [ ] `/components/PostMatchChat.tsx` を作成
  - メッセージ一覧表示
  - 入力欄
  - 送信ボタン
  - 店舗情報付きメッセージの表示

#### 1.4 テンプレートメッセージ選択UI
- [ ] `/components/MessageTemplateSelector.tsx` を作成
  - 5種類のテンプレートから選択
  - 選択すると入力欄に自動挿入

#### 1.5 ダッシュボードへの統合
- [ ] マッチ成立後に「近くの居酒屋」セクションを表示
- [ ] 「ギラ飲みチャットに参加」ボタンの追加

**使用するダミーデータ**:
```typescript
const dummyRestaurants = [
  {
    id: "1",
    name: "居酒屋 ギラ",
    image: "/images/restaurant-placeholder.jpg",
    mapUrl: "https://maps.google.com/?q=居酒屋ギラ,北九州",
  },
  // ... 他の店舗
];

const dummyMessages = [
  {
    id: "1",
    userId: "user1",
    nickname: "太郎",
    text: "今日の試合最高でした！",
    restaurant: null,
    timestamp: "2025-01-15T20:30:00Z",
  },
  // ... 他のメッセージ
];
```

---

### Phase 2: Map機能の実装（Google Maps API）
**目標**: 店舗共有の可視化

#### 2.1 Google Maps API セットアップ

**Google Maps APIキーの取得方法**:

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成（または既存のプロジェクトを選択）
3. 「APIとサービス」→「ライブラリ」から以下を有効化：
   - Maps JavaScript API
   - Places API（将来的に店舗情報取得用）
4. 「認証情報」→「認証情報を作成」→「APIキー」
5. 作成されたAPIキーをコピー
6. APIキーの制限を設定（推奨）：
   - アプリケーションの制限: HTTPリファラー
   - 許可するリファラー: `http://localhost:3000/*`, `https://yourdomain.com/*`
   - API の制限: Maps JavaScript APIのみ

**環境変数の設定**:

`hakkutsu-front/.env.local` ファイルを作成または編集：

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**注意**:
- `.env.local` はGitにコミットしないこと（`.gitignore`に含まれているか確認）
- APIキーは本番環境では必ず制限を設定すること

**開発用の代替案**:
Google Maps APIキーを取得しない場合、Phase 2はスキップして、Phase 3以降に進むことも可能です。Map機能なしでもギラ飲みチャットは動作します。

- [x] Google Cloud Platformでプロジェクト作成
- [x] Maps JavaScript API を有効化
- [x] APIキーの取得と設定
- [x] `.env.local` に `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` を追加

#### 2.2 Mapコンポーネントの作成
- [ ] `/components/RestaurantMap.tsx` を作成
- [ ] `@react-google-maps/api` ライブラリのインストール
- [ ] 基本的な地図表示の実装
- [ ] 会場を中心とした地図表示

#### 2.3 カスタムマーカーの実装
- [ ] ギラヴァンツロゴの画像を用意
- [ ] カスタムマーカーコンポーネントの作成
- [ ] 共有数に応じたマーカーサイズの変更ロジック
- [ ] マーカークリック時の店舗詳細ポップアップ

#### 2.4 リアルタイム更新
- [ ] チャットで店舗リンクが送信されたらMapを更新
- [ ] アニメーション効果の追加（マーカー出現時）

#### 2.5 Mapをチャット画面に統合
- [ ] タブまたはモーダルでMap表示
- [ ] 「Map」ボタンをチャット画面に追加
- [ ] モバイル対応（フルスクリーン表示）

---

### Phase 3: 状態管理とデータフロー
**目標**: フロントエンドの状態管理を整える

#### 3.1 Context/Store の作成
- [ ] `/lib/postMatchChatContext.tsx` を作成
  - チャットメッセージの状態管理
  - 店舗情報の状態管理
  - 店舗共有カウントの状態管理

#### 3.2 ローカルストレージ連携
- [ ] チャット履歴をローカルストレージに保存
- [ ] ページリロード時に復元

#### 3.3 型定義の整備
- [ ] `/types/postMatchChat.ts` を作成
```typescript
export interface Restaurant {
  id: string;
  name: string;
  address: string;
  imageUrl: string;
  googleMapUrl: string;
  latitude: number;
  longitude: number;
  category: "izakaya" | "cafe" | "ramen" | "other";
}

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  icon?: string;
  text: string;
  restaurant?: Restaurant;
  timestamp: string;
}

export interface PostMatchChat {
  id: string;
  matchId: string;
  opponent: string;
  date: string;
  startTime: string;
  endTime: string;
  messages: ChatMessage[];
  participants: string[];
}

export interface RestaurantShare {
  restaurantId: string;
  count: number;
  lastSharedAt: string;
}
```

---

### Phase 4: インタラクション強化
**目標**: ユーザー体験の向上

#### 4.1 通知機能
- [ ] 試合終了時に「ギラ飲みチャットが開設されました」通知
- [ ] 新しいメッセージの通知（ブラウザ通知API）
- [ ] 未読メッセージカウント表示

#### 4.2 画像プレビュー
- [ ] 店舗画像のモーダル表示
- [ ] ズーム機能

#### 4.3 メッセージ編集・削除
- [ ] 自分のメッセージの編集機能
- [ ] 自分のメッセージの削除機能
- [ ] 削除確認ダイアログ

#### 4.4 絵文字・スタンプ
- [ ] 絵文字ピッカーの追加
- [ ] ギラヴァンツカスタムスタンプ（将来的に）

#### 4.5 チャット終了アニメーション
- [ ] 23:59にチャットが閉鎖される際のアニメーション
- [ ] 「チャットは終了しました」メッセージ

---

### Phase 5: バックエンド実装準備
**目標**: API仕様を定義し、バックエンド実装に備える

#### 5.1 API仕様書の作成
- [ ] `/docs/API_SPEC_POST_MATCH_CHAT.md` を作成
- [ ] 必要なエンドポイントの定義
  - `GET /matches/{matchId}/restaurants` - 会場近くの店舗取得
  - `GET /matches/{matchId}/post-match-chat` - 試合後チャット取得
  - `POST /post-match-chats/{chatId}/messages` - メッセージ送信
  - `GET /post-match-chats/{chatId}/restaurant-shares` - 店舗共有状況取得
  - `POST /post-match-chats/{chatId}/close` - チャット閉鎖（スケジューラー用）

#### 5.2 モックAPIの作成
- [ ] `/lib/mockApi/postMatchChat.ts` を作成
- [ ] フロントエンドのテスト用にモックデータを返す関数

---

## バックエンド実装（後回し）

### Phase 6: データベース設計

#### 6.1 テーブル設計
```sql
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
  is_closed BOOLEAN DEFAULT false,
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
  updated_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT false,
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
  last_read_at TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES post_match_chats(chat_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

#### 6.2 インデックスの追加
```sql
CREATE INDEX idx_restaurants_venue ON restaurants(venue_id);
CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_restaurant_shares_chat ON restaurant_shares(chat_id, restaurant_id);
CREATE INDEX idx_chat_participants_chat ON chat_participants(chat_id);
```

### Phase 7: Lambda関数の実装

#### 7.1 店舗情報取得
- [ ] `handler.getRestaurantsByVenue` を実装
- [ ] 会場IDに基づいて近くの店舗を取得
- [ ] 距離順にソート

#### 7.2 チャット管理
- [ ] `handler.getPostMatchChat` - チャット情報とメッセージ取得
- [ ] `handler.createPostMatchChat` - 試合終了時にチャット自動作成
- [ ] `handler.sendChatMessage` - メッセージ送信
- [ ] `handler.closePostMatchChat` - チャット閉鎖（スケジューラー）

#### 7.3 店舗共有管理
- [ ] `handler.getRestaurantShares` - 店舗共有状況取得
- [ ] 共有数のカウント集計

#### 7.4 リアルタイム通信（WebSocket）
- [ ] API Gateway WebSocket の設定
- [ ] `onConnect`, `onDisconnect`, `sendMessage` ハンドラー
- [ ] メッセージのブロードキャスト

### Phase 8: スケジューラー設定

#### 8.1 EventBridge ルールの作成
- [ ] 試合終了時刻にチャット自動作成
- [ ] 毎日23:59にチャット自動クローズ
- [ ] チェックイン済みユーザーへの通知

---

## 追加検討事項・改善提案

### 1. プライバシーとセキュリティ
- [ ] チェックイン済みユーザーのみが参加できる仕組みの厳格化
- [ ] 不適切なメッセージの報告機能
- [ ] ブロック機能の実装

### 2. ユーザー体験の向上
- [ ] **店舗の予約機能**: 人気店への直接予約リンク統合
- [ ] **混雑状況の表示**: 「この店に○人が向かっています」リアルタイム表示
- [ ] **グループ分け**: 「この店に行く人」で自動グループ作成
- [ ] **写真共有**: チャット内で飲み会の写真を共有
- [ ] **リアクション機能**: メッセージに「いいね」「行きたい」などのリアクション

### 3. ゲーミフィケーション
- [ ] **店舗レビュー**: 訪問後に簡単な評価を投稿
- [ ] **常連バッジ**: 同じ店に複数回行った人にバッジ付与
- [ ] **試合&飲み会参加スタンプ**: 参加履歴を可視化
- [ ] **ギラ飲みMVP**: 最も多くの人を集めたユーザーを表彰

### 4. 店舗側との連携
- [ ] **クーポン配布**: 提携店舗からの割引クーポン
- [ ] **お店からのウェルカムメッセージ**: 「ギラサポ歓迎！」
- [ ] **売上データ共有**: アプリからの来店数を店舗に報告
- [ ] **特別メニュー**: ギラサポ限定メニューの提供

### 5. Map機能の拡張
- [ ] **ヒートマップ表示**: どのエリアが人気かを色で表示
- [ ] **フィルタリング**: 「居酒屋」「カフェ」「ラーメン」などカテゴリ別
- [ ] **ルート案内**: 会場から店舗への最適ルート表示
- [ ] **AR機能**: カメラで周りを映すと店舗情報が表示（将来的に）

### 6. 時間帯別の対応
- [ ] **昼試合**: ランチ店を優先表示
- [ ] **夜試合**: 居酒屋を優先表示
- [ ] **試合前の待ち合わせ**: 試合前にカフェなどを表示

### 7. コミュニティ機能強化
- [ ] **MVP投票**: チャット内で今日のMVP選手を投票
- [ ] **試合振り返り**: スコアや見どころを自動表示
- [ ] **次回試合の参加募集**: そのまま次の試合の募集も可能に
- [ ] **写真ギャラリー**: その日の試合&飲み会の写真をまとめて表示

### 8. 通知機能の拡充
- [ ] **プッシュ通知**: 試合終了時、メッセージ受信時
- [ ] **メール通知**: 重要なお知らせ
- [ ] **通知設定**: ユーザーが通知のオン/オフを選択可能

---

## 実装スケジュール（目安）

| Phase | 期間 | 作業内容 |
|-------|------|---------|
| Phase 1 | 1週間 | UI/UX プロトタイプ作成 |
| Phase 2 | 1週間 | Map機能の実装 |
| Phase 3 | 3日 | 状態管理とデータフロー |
| Phase 4 | 3日 | インタラクション強化 |
| Phase 5 | 2日 | バックエンド実装準備 |
| Phase 6 | 1週間 | データベース設計と実装 |
| Phase 7 | 1週間 | Lambda関数の実装 |
| Phase 8 | 3日 | スケジューラー設定 |

**合計**: 約4週間

---

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 14 (App Router)
- **スタイリング**: Tailwind CSS
- **状態管理**: React Context API / Zustand (検討中)
- **Map**: `@react-google-maps/api`
- **リアルタイム通信**: WebSocket (将来的に)

### バックエンド
- **サーバーレス**: AWS Lambda
- **API**: API Gateway (REST + WebSocket)
- **データベース**: Amazon Aurora MySQL
- **スケジューラー**: EventBridge
- **通知**: SNS / SES

### 外部API
- **Google Maps JavaScript API**: Map表示
- **Google Places API**: 店舗情報取得（将来的に）

---

## 次のステップ

1. **Phase 1の開始**: `/post-match-chat/[matchId]/page.tsx` の作成から着手
2. **デザインモックの確認**: Figmaなどでデザインを確認（必要に応じて）
3. **ダミーデータの準備**: 店舗とメッセージのダミーデータを用意
4. **フィードバック**: UI/UXを確認してもらい、調整

---

## 参考リンク

- [Google Maps JavaScript API ドキュメント](https://developers.google.com/maps/documentation/javascript)
- [React Google Maps API](https://react-google-maps-api-docs.netlify.app/)
- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
