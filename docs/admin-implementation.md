# 管理者画面実装ドキュメント

## 概要

GiraMatchアプリケーションの管理者画面の実装計画と仕様をまとめたドキュメントです。

---

## デザイン方針

### カラースキーム
管理画面はユーザー画面と共通のカラーパレットを使用します：

- **黄色 (Yellow-400)**: 主要カラー、アクセント、ボタン
- **黒 (Black)**: 背景、ナビゲーション
- **白 (White)**: テキスト、カード背景
- **赤 (Red-600)**: 警告、削除アクション、重要な操作

### レイアウト構成

```
┌─────────────────────────────────────────────────┐
│ ヘッダー (黄色ボーダー、黒背景)                   │
├────────┬────────────────────────────────────────┤
│        │                                        │
│ サイド │      メインコンテンツエリア              │
│ バー   │      (各種管理画面)                     │
│        │                                        │
│ (黄色  │                                        │
│  強調) │                                        │
│        │                                        │
└────────┴────────────────────────────────────────┘
```

---

## ディレクトリ構造

```
hakkutsu-front/src/app/admin/
├── layout.tsx                    # 管理画面共通レイアウト
├── page.tsx                      # ダッシュボード
├── matches/
│   ├── page.tsx                  # 試合一覧
│   ├── [id]/
│   │   └── page.tsx              # 試合詳細・編集
│   └── new/
│       └── page.tsx              # 試合追加
├── users/
│   ├── page.tsx                  # ユーザー一覧・検索
│   └── [id]/
│       └── page.tsx              # ユーザー詳細・編集
├── reports/
│   ├── page.tsx                  # 報告一覧
│   └── [id]/
│       └── page.tsx              # 報告詳細・対応
├── chats/
│   ├── page.tsx                  # チャット一覧
│   └── [id]/
│       └── page.tsx              # チャット詳細・内容確認
├── check-ins/
│   └── page.tsx                  # 来場チェック管理
├── reviews/
│   └── page.tsx                  # レビュー管理
└── matchings/
    └── page.tsx                  # マッチング管理
```

---

## 実装機能一覧

### 1. ダッシュボード (`/admin`)

#### 全体統計
- 総ユーザー数
- 総試合数
- チャット利用数
- マッチング成功数
- レビュー投稿数

#### アクティブユーザー統計
- 日次 (過去24時間)
- 週次 (過去7日間)
- 月次 (過去30日間)

#### 試合統計
- 試合別来場者数
- 人気試合ランキング

#### クイックアクション
- 試合を追加
- ユーザー検索
- 報告を確認
- チャット監視

**API エンドポイント:**
- `GET /admin/stats` - 統計データ取得

---

### 2. 試合管理 (`/admin/matches`)

#### 試合一覧 (`/admin/matches`)
- 全試合の一覧表示
- ステータス別フィルター (開催予定 / 開催中 / 終了)
- 日付順ソート
- 試合別統計 (マッチング数、来場者数)

#### 試合追加 (`/admin/matches/new`)
- 新規試合登録フォーム
  - 対戦相手 (opponent)
  - 日付 (date)
  - 時間 (time)
  - 会場 (venue)
  - ステータス (status)
  - 試合画像 (image) ※オプション

#### 試合詳細・編集 (`/admin/matches/[id]`)
- 試合情報の編集
- ステータス変更
- 試合の削除
- 関連統計の表示
  - マッチング数
  - 来場チェック数
  - チャット数

**API エンドポイント:**
- `GET /matches` - 試合一覧取得 (既存)
- `GET /matches/:id` - 試合詳細取得 (既存)
- `POST /admin/matches` - 試合追加 ⭐新規
- `PUT /admin/matches/:id` - 試合更新 ⭐新規
- `DELETE /admin/matches/:id` - 試合削除 ⭐新規
- `GET /admin/matches/:id/stats` - 試合別統計 ⭐新規

---

### 3. ユーザー管理 (`/admin/users`)

#### ユーザー一覧・検索 (`/admin/users`)
- 全ユーザーの一覧表示
- 検索機能
  - ユーザーID
  - 表示名
  - メールアドレス
- フィルタリング
  - 登録日
  - ステータス (有効 / 停止 / 削除)
- ページネーション

#### ユーザー詳細・編集 (`/admin/users/[id]`)
- ユーザー情報表示
  - 基本情報 (ID, 名前, 登録日)
  - プロフィール情報
  - アカウントステータス
- プロフィール編集
- アカウントステータス変更
  - 有効化
  - 停止
  - 削除
- ユーザーアクティビティ履歴
  - 来場チェック履歴
  - チャット参加履歴
  - マッチング履歴
  - レビュー投稿履歴

**API エンドポイント:**
- `GET /admin/users` - ユーザー一覧取得 ⭐新規
- `GET /admin/users/:id` - ユーザー詳細取得 ⭐新規
- `PUT /admin/users/:id` - ユーザー情報更新 ⭐新規
- `PUT /admin/users/:id/status` - ステータス変更 ⭐新規
- `DELETE /admin/users/:id` - ユーザー削除 ⭐新規
- `GET /admin/users/:id/activity` - アクティビティ履歴 ⭐新規

---

### 4. ユーザー報告対応 (`/admin/reports`)

#### 報告一覧 (`/admin/reports`)
- 全報告の一覧表示
- ステータス別フィルター
  - 未対応
  - 対応中
  - 解決済み
- 優先度順ソート
- 報告日時順ソート

#### 報告詳細・対応 (`/admin/reports/[id]`)
- 報告内容の確認
  - 報告理由
  - 報告内容詳細
  - 報告日時
- 報告者情報
  - ユーザーID
  - ユーザー名
- 被報告者情報
  - ユーザーID
  - ユーザー名
  - 過去の報告履歴
- 対応アクション
  - 警告送信
  - アカウント停止 (期間指定)
  - アカウント削除
  - 報告却下
- 対応履歴の記録
- コメント・メモの追加

**データモデル (Reports テーブル):**
```javascript
{
  reportId: string,           // 報告ID (PK)
  reporterId: string,         // 報告者ID
  reportedUserId: string,     // 被報告者ID
  reason: string,             // 報告理由
  details: string,            // 詳細内容
  status: string,             // 未対応 | 対応中 | 解決済み
  priority: string,           // 低 | 中 | 高
  actionTaken: string,        // 対応内容
  notes: string,              // メモ
  createdAt: string,          // 報告日時
  updatedAt: string,          // 更新日時
  handledBy: string,          // 対応管理者ID
}
```

**API エンドポイント:**
- `GET /admin/reports` - 報告一覧取得 ⭐新規
- `GET /admin/reports/:id` - 報告詳細取得 ⭐新規
- `PUT /admin/reports/:id` - 報告対応・更新 ⭐新規
- `POST /admin/reports/:id/actions` - 対応アクション実行 ⭐新規

---

### 5. チャット・メッセージ管理 (`/admin/chats`)

#### チャット監視 (`/admin/chats`)
- 全チャットルームの一覧
- 試合別フィルター
- 日付別フィルター
- 不適切フラグ付きチャット優先表示

#### チャット詳細 (`/admin/chats/[id]`)
- チャット参加者情報
- メッセージ履歴表示
- 不適切メッセージの検出・マーク
- モデレーション機能
  - 特定メッセージの削除
  - チャットルームの強制終了
  - ユーザーへの警告

**API エンドポイント:**
- `GET /admin/chats` - 全チャット一覧取得 ⭐新規
- `GET /admin/chats/:id` - チャット詳細取得 (既存の拡張)
- `DELETE /admin/chats/:id/messages/:messageId` - メッセージ削除 ⭐新規
- `POST /admin/chats/:id/close` - チャット強制終了 ⭐新規

---

### 6. 来場チェック管理 (`/admin/check-ins`)

#### チェックイン履歴
- 全チェックインの一覧表示
- 試合別チェックイン数
- ユーザー別チェックイン履歴
- 日付範囲フィルター

#### 不正検出
- 重複チェックインの検出
  - 同一ユーザー・同一試合の重複
  - 物理的に不可能な位置からのチェック
- 不正チェックインの削除
- ユーザーへの警告

**API エンドポイント:**
- `GET /admin/check-ins` - 全チェックイン取得 ⭐新規
- `GET /admin/check-ins/duplicates` - 重複検出 ⭐新規
- `DELETE /admin/check-ins/:id` - チェックイン削除 ⭐新規

---

### 7. レビュー・評価管理 (`/admin/reviews`)

#### レビュー一覧
- 全レビューの表示
- 承認待ちレビューの確認
- 評価別フィルター (1〜5星)
- 試合別フィルター

#### モデレーション
- レビューの承認 / 却下
- 不適切なレビューの削除
- 評価統計の表示
  - 平均評価
  - 評価分布グラフ

**API エンドポイント:**
- `GET /admin/reviews` - 全レビュー取得 ⭐新規
- `PUT /admin/reviews/:id/approve` - レビュー承認 ⭐新規
- `PUT /admin/reviews/:id/reject` - レビュー却下 ⭐新規
- `DELETE /admin/reviews/:id` - レビュー削除 ⭐新規
- `GET /admin/reviews/stats` - レビュー統計 ⭐新規

---

### 8. マッチング管理 (`/admin/matchings`)

#### マッチング状況
- 全マッチングの一覧
- 試合別マッチング数
- マッチング成功率の統計

#### 問題対応
- 問題のあるマッチングの解除
- ユーザーのマッチング履歴確認

**データモデル (Matchings テーブル):**
```javascript
{
  matchingId: string,         // マッチングID (PK)
  matchId: string,            // 試合ID
  user1Id: string,            // ユーザー1 ID
  user2Id: string,            // ユーザー2 ID
  status: string,             // pending | accepted | rejected
  createdAt: string,          // 作成日時
  chatId: string,             // チャットID (関連)
}
```

**API エンドポイント:**
- `GET /admin/matchings` - 全マッチング取得 ⭐新規
- `GET /admin/matchings/stats` - マッチング統計 ⭐新規
- `DELETE /admin/matchings/:id` - マッチング解除 ⭐新規
- `GET /admin/users/:id/matchings` - ユーザー別マッチング履歴 ⭐新規

---

## 認証・権限管理

### 管理者認証

管理者専用の認証システムを実装します。

#### フロントエンド

**AdminGuard コンポーネント**
```typescript
// src/components/AdminGuard.tsx
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login?redirect=/admin");
        return;
      }

      // 管理者権限チェックAPI呼び出し
      const res = await fetch(`${API_URL}/admin/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setIsAdmin(true);
      } else {
        router.push("/");
      }
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return null;

  return <>{children}</>;
}
```

#### バックエンド

**管理者ミドルウェア**
```javascript
// handler.js
function requireAdmin(req, res, next) {
  try {
    const h = req.headers["authorization"] || req.headers["Authorization"];
    if (!h || typeof h !== "string" || !h.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = h.slice("Bearer ".length).trim();
    const payload = jwt.verify(token, JWT_SECRET);

    // ユーザーの管理者権限をチェック
    const user = await docClient.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId: payload.sub } })
    );

    if (!user.Item || !user.Item.isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// 管理者権限確認エンドポイント
app.get("/admin/verify", requireAdmin, (req, res) => {
  res.json({ isAdmin: true });
});
```

**Users テーブルに追加するフィールド:**
```javascript
{
  userId: string,
  name: string,
  passwordHash: string,
  isAdmin: boolean,         // ⭐追加: 管理者フラグ
  createdAt: string,
}
```

---

## 必要な新規APIエンドポイント一覧

### 認証・権限
- `GET /admin/verify` - 管理者権限確認

### ダッシュボード
- `GET /admin/stats` - 統計データ取得

### 試合管理
- `POST /admin/matches` - 試合追加
- `PUT /admin/matches/:id` - 試合更新
- `DELETE /admin/matches/:id` - 試合削除
- `GET /admin/matches/:id/stats` - 試合別統計

### ユーザー管理
- `GET /admin/users` - ユーザー一覧取得
- `GET /admin/users/:id` - ユーザー詳細取得
- `PUT /admin/users/:id` - ユーザー情報更新
- `PUT /admin/users/:id/status` - ステータス変更
- `DELETE /admin/users/:id` - ユーザー削除
- `GET /admin/users/:id/activity` - アクティビティ履歴

### 報告管理
- `GET /admin/reports` - 報告一覧取得
- `GET /admin/reports/:id` - 報告詳細取得
- `PUT /admin/reports/:id` - 報告対応・更新
- `POST /admin/reports/:id/actions` - 対応アクション実行

### チャット管理
- `GET /admin/chats` - 全チャット一覧取得
- `DELETE /admin/chats/:id/messages/:messageId` - メッセージ削除
- `POST /admin/chats/:id/close` - チャット強制終了

### 来場チェック管理
- `GET /admin/check-ins` - 全チェックイン取得
- `GET /admin/check-ins/duplicates` - 重複検出
- `DELETE /admin/check-ins/:id` - チェックイン削除

### レビュー管理
- `GET /admin/reviews` - 全レビュー取得
- `PUT /admin/reviews/:id/approve` - レビュー承認
- `PUT /admin/reviews/:id/reject` - レビュー却下
- `DELETE /admin/reviews/:id` - レビュー削除
- `GET /admin/reviews/stats` - レビュー統計

### マッチング管理
- `GET /admin/matchings` - 全マッチング取得
- `GET /admin/matchings/stats` - マッチング統計
- `DELETE /admin/matchings/:id` - マッチング解除
- `GET /admin/users/:id/matchings` - ユーザー別マッチング履歴

---

## 必要な新規DynamoDBテーブル

### Reports テーブル

```javascript
{
  TableName: "Reports",
  KeySchema: [
    { AttributeName: "reportId", KeyType: "HASH" }
  ],
  AttributeDefinitions: [
    { AttributeName: "reportId", AttributeType: "S" },
    { AttributeName: "status", AttributeType: "S" },
    { AttributeName: "createdAt", AttributeType: "S" }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: "StatusIndex",
      KeySchema: [
        { AttributeName: "status", KeyType: "HASH" },
        { AttributeName: "createdAt", KeyType: "RANGE" }
      ],
      Projection: { ProjectionType: "ALL" }
    }
  ]
}
```

### Matchings テーブル

```javascript
{
  TableName: "Matchings",
  KeySchema: [
    { AttributeName: "matchingId", KeyType: "HASH" }
  ],
  AttributeDefinitions: [
    { AttributeName: "matchingId", AttributeType: "S" },
    { AttributeName: "matchId", AttributeType: "S" },
    { AttributeName: "createdAt", AttributeType: "S" }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: "MatchIndex",
      KeySchema: [
        { AttributeName: "matchId", KeyType: "HASH" },
        { AttributeName: "createdAt", KeyType: "RANGE" }
      ],
      Projection: { ProjectionType: "ALL" }
    }
  ]
}
```

---

## 実装の優先順位と詳細手順

### Phase 1: 基本機能（最優先）

#### [1] 管理画面レイアウト・ルーティング構築
- [1-1] 管理画面共通レイアウトの作成 (`/admin/layout.tsx`)
  - ヘッダー（ロゴ、ログアウトボタン）
  - サイドバー（ナビゲーションメニュー）
  - メインコンテンツエリア
- [1-2] 認証ガードコンポーネントの作成

#### [2] 管理者認証・権限チェック実装
- [2-1] バックエンド: Users テーブルに `isAdmin` フィールド追加
- [2-2] バックエンド: `requireAdmin` ミドルウェアの実装
- [2-3] バックエンド: `GET /admin/verify` エンドポイント追加
- [2-4] フロントエンド: AdminGuard コンポーネントの実装

#### [3] ダッシュボード（基本統計）
- [3-1] バックエンド: `GET /admin/stats` エンドポイント実装
  - 総ユーザー数
  - 総試合数
  - チャット数
  - レビュー数
- [3-2] フロントエンド: ダッシュボード画面の実装 (`/admin/page.tsx`)
  - 統計カード表示
  - クイックアクション

#### [4] 試合管理（一覧・追加・編集・削除）
- [4-1] バックエンド: 試合管理API実装
  - `POST /admin/matches` - 試合追加
  - `PUT /admin/matches/:id` - 試合更新
  - `DELETE /admin/matches/:id` - 試合削除
  - `GET /admin/matches/:id/stats` - 試合別統計
- [4-2] フロントエンド: 試合一覧画面 (`/admin/matches/page.tsx`)
- [4-3] フロントエンド: 試合追加画面 (`/admin/matches/new/page.tsx`)
- [4-4] フロントエンド: 試合詳細・編集画面 (`/admin/matches/[id]/page.tsx`)

#### [5] ユーザー管理（一覧・検索・詳細）
- [5-1] バックエンド: ユーザー管理API実装
  - `GET /admin/users` - ユーザー一覧取得（検索・フィルタリング対応）
  - `GET /admin/users/:id` - ユーザー詳細取得
  - `PUT /admin/users/:id` - ユーザー情報更新
  - `PUT /admin/users/:id/status` - ステータス変更
  - `DELETE /admin/users/:id` - ユーザー削除
  - `GET /admin/users/:id/activity` - アクティビティ履歴
- [5-2] フロントエンド: ユーザー一覧・検索画面 (`/admin/users/page.tsx`)
- [5-3] フロントエンド: ユーザー詳細・編集画面 (`/admin/users/[id]/page.tsx`)

---

### Phase 2: モデレーション機能

#### [6] ユーザー報告対応
- [6-1] バックエンド: Reports テーブル作成
- [6-2] バックエンド: 報告管理API実装
  - `GET /admin/reports` - 報告一覧取得
  - `GET /admin/reports/:id` - 報告詳細取得
  - `PUT /admin/reports/:id` - 報告対応・更新
  - `POST /admin/reports/:id/actions` - 対応アクション実行
- [6-3] フロントエンド: 報告一覧画面 (`/admin/reports/page.tsx`)
- [6-4] フロントエンド: 報告詳細・対応画面 (`/admin/reports/[id]/page.tsx`)

#### [7] チャット・メッセージ管理
- [7-1] バックエンド: チャット管理API実装
  - `GET /admin/chats` - 全チャット一覧取得
  - `DELETE /admin/chats/:id/messages/:messageId` - メッセージ削除
  - `POST /admin/chats/:id/close` - チャット強制終了
- [7-2] フロントエンド: チャット一覧画面 (`/admin/chats/page.tsx`)
- [7-3] フロントエンド: チャット詳細・監視画面 (`/admin/chats/[id]/page.tsx`)

#### [8] レビュー管理
- [8-1] バックエンド: レビュー管理API実装
  - `GET /admin/reviews` - 全レビュー取得
  - `PUT /admin/reviews/:id/approve` - レビュー承認
  - `PUT /admin/reviews/:id/reject` - レビュー却下
  - `DELETE /admin/reviews/:id` - レビュー削除
  - `GET /admin/reviews/stats` - レビュー統計
- [8-2] フロントエンド: レビュー一覧・管理画面 (`/admin/reviews/page.tsx`)

---

### Phase 3: 高度な機能

#### [9] 来場チェック管理
- [9-1] バックエンド: 来場チェック管理API実装
  - `GET /admin/check-ins` - 全チェックイン取得
  - `GET /admin/check-ins/duplicates` - 重複検出
  - `DELETE /admin/check-ins/:id` - チェックイン削除
- [9-2] フロントエンド: 来場チェック管理画面 (`/admin/check-ins/page.tsx`)

#### [10] マッチング管理
- [10-1] バックエンド: Matchings テーブル作成
- [10-2] バックエンド: マッチング管理API実装
  - `GET /admin/matchings` - 全マッチング取得
  - `GET /admin/matchings/stats` - マッチング統計
  - `DELETE /admin/matchings/:id` - マッチング解除
  - `GET /admin/users/:id/matchings` - ユーザー別マッチング履歴
- [10-3] フロントエンド: マッチング管理画面 (`/admin/matchings/page.tsx`)

#### [11] 統計・分析の詳細化
- [11-1] バックエンド: 詳細統計API実装
  - 期間別ユーザー登録推移
  - 試合別人気ランキング
  - マッチング成功率分析
- [11-2] フロントエンド: グラフ・チャート表示の実装

---

## UI コンポーネント設計

### 共通コンポーネント

#### PageHeader
```typescript
interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
}
```

#### DataTable
```typescript
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
}
```

#### StatCard
```typescript
interface StatCardProps {
  title: string;
  value: number | string;
  color: "yellow" | "red" | "white" | "black";
  subtitle?: string;
  icon?: React.ReactNode;
}
```

#### ActionButton
```typescript
interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant: "primary" | "danger" | "secondary";
  disabled?: boolean;
}
```

#### StatusBadge
```typescript
interface StatusBadgeProps {
  status: string;
  color: "yellow" | "red" | "green" | "gray";
}
```

---

## セキュリティ考慮事項

1. **認証・認可**
   - すべての管理者APIは `requireAdmin` ミドルウェアで保護
   - JWTトークンの有効期限管理
   - 管理者フラグ (`isAdmin`) の厳密なチェック

2. **データアクセス制御**
   - 管理者のみが全ユーザーデータにアクセス可能
   - ログインなしで管理画面にアクセス不可

3. **操作ログ**
   - 重要な操作（削除、ステータス変更）のログ記録
   - 操作者の記録 (`handledBy` フィールド)

4. **XSS対策**
   - ユーザー入力のサニタイズ
   - React の自動エスケープを活用

5. **CSRF対策**
   - トークンベースの認証使用
   - CORS設定の適切な管理

---

## テスト計画

### 単体テスト
- 各APIエンドポイントのテスト
- 認証・認可ミドルウェアのテスト
- バリデーション関数のテスト

### 統合テスト
- 管理画面フロー全体のテスト
- ユーザー管理フローのテスト
- 報告対応フローのテスト

### E2Eテスト
- 管理者ログインから各種操作まで
- ブラウザ自動化テスト

---

## デプロイメント

### 環境変数

```bash
# .env.local (フロントエンド)
NEXT_PUBLIC_API_URL=http://localhost:4000

# docker-compose.yml / template.yaml (AWS SAM, バックエンド)
REPORTS_TABLE=reports-table-dev
MATCHINGS_TABLE=matchings-table-dev
```

### Docker Compose 更新

```yaml
# docker-compose.yml
services:
  api:
    environment:
      - REPORTS_TABLE=reports-table-dev
      - MATCHINGS_TABLE=matchings-table-dev
```

---

## 今後の拡張予定

1. **通知機能**
   - システム通知の作成・配信
   - メンテナンス告知

2. **データエクスポート**
   - CSV/JSON形式でのデータエクスポート
   - レポート生成機能

3. **詳細分析**
   - ユーザー行動分析
   - コンバージョン分析
   - A/Bテスト機能

4. **自動化**
   - 不適切コンテンツの自動検出
   - スパムユーザーの自動ブロック
   - 異常アクティビティのアラート

---

## まとめ

このドキュメントに基づき、段階的に管理者画面を実装していきます。Phase 1の基本機能から着手し、フィードバックを受けながら Phase 2、Phase 3 へと進めます。
