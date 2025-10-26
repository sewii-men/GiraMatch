# GiraMatch（ギラベント）

ギラヴァンツ北九州のファンが試合観戦の同行者を見つけるマッチングアプリ

## 📋 プロジェクト概要

**GiraMatch**は、サッカークラブ「ギラヴァンツ北九州」のファンが試合観戦を一緒に楽しむ仲間を見つけるためのモバイル Web アプリケーションです。観戦スタイルや座席の好みに基づいてマッチングし、チャット機能で事前にコミュニケーションを取り、試合後には相互評価を行うことで信頼性の高いコミュニティを形成します。

## 🎯 主な機能

- **試合一覧**: 今後の試合スケジュールを閲覧
- **マッチング**: 観戦スタイルや座席の好みに基づいて同行者を検索
- **チャット**: マッチした相手と 1 対 1 またはグループでメッセージ交換
- **チェックイン**: スタジアム到着時にチェックイン
- **レビューシステム**: 試合後に相手を評価し、信頼スコアを構築

## 🏗️ アーキテクチャ

### 技術スタック

| レイヤー           | 技術                                           |
| ------------------ | ---------------------------------------------- |
| **フロントエンド** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **バックエンド**   | Node.js, Express, AWS SAM                      |
| **データベース**   | AWS DynamoDB                                   |
| **インフラ**       | AWS Lambda, API Gateway, Vercel                |
| **開発環境**       | Docker Compose, DynamoDB Local                 |

### プロジェクト構成

```
hakkutsu-app/
├── hakkutsu-front/          # Next.jsフロントエンド
│   ├── src/
│   │   ├── app/             # App Routerページ
│   │   └── lib/             # APIクライアント、ユーティリティ
│   └── package.json
│
├── hakkutsu-api/            # Express + Lambda バックエンド
│   ├── handler.js           # Express アプリ本体 + Lambda ハンドラー
│   ├── local.js             # ローカル実行エントリ（Docker 用）
│   ├── template.yaml        # AWS SAM テンプレート
│   ├── scripts/             # セットアップ/シードスクリプト
│   ├── Dockerfile
│   └── package.json
│
├── docs/                    # ドキュメント
│   ├── DATABASE_DESIGN.md   # データベース設計
│   └── IMPLEMENTATION_GUIDE.md  # 実装ガイド
│
├── docker-compose.yml       # ローカル開発環境
└── README.md                # このファイル
```

## 🚀 クイックスタート

### 前提条件

- Node.js 20.x 以上
- Docker & Docker Compose
- npm または yarn

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/hakkutsu-app.git
cd hakkutsu-app
```

### 2. ローカル開発環境のセットアップ

#### バックエンド

```bash
# DynamoDBとAPIサーバーを起動
docker-compose up -d

# APIディレクトリに移動
cd hakkutsu-api

# 依存関係をインストール
npm install

# DynamoDBテーブルを作成
npm run create-tables
```

#### フロントエンド

```bash
# フロントエンドディレクトリに移動
cd hakkutsu-front

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

### 3. アクセス

- **フロントエンド**: http://localhost:3000
- **バックエンド API**: http://localhost:4000
- **DynamoDB Admin**: http://localhost:8000

## 📚 ドキュメント

詳細なドキュメントは `docs/` ディレクトリを参照してください：

- **[データベース設計](./docs/DATABASE_DESIGN.md)**: テーブル定義、リレーション、クエリパターン
- **[実装ガイド](./docs/IMPLEMENTATION_GUIDE.md)**: ステップバイステップの実装手順

## 🗄️ データベース設計

### テーブル一覧

| テーブル名               | 説明                             |
| ------------------------ | -------------------------------- |
| Users                    | ユーザー情報と信頼スコア         |
| Matches                  | サッカー試合情報                 |
| UserMatches              | ユーザーの試合参加と観戦スタイル |
| MatchRequests            | マッチングリクエスト             |
| Conversations            | チャット会話                     |
| ConversationParticipants | 会話参加者（多対多）             |
| Messages                 | メッセージ                       |
| CheckIns                 | スタジアムチェックイン           |
| Reviews                  | レビュー・評価                   |

詳細は [DATABASE_DESIGN.md](./docs/DATABASE_DESIGN.md) を参照してください。

## 🔧 開発

### ローカルでの API 開発

```bash
# DynamoDB Localの起動
docker-compose up dynamodb -d

# APIサーバーの起動（ホットリロード）
cd hakkutsu-api
npm run dev
```

### ローカルでのフロントエンド開発

```bash
cd hakkutsu-front
npm run dev
```

### テーブルの再作成

```bash
cd hakkutsu-api

# テーブルを削除して再作成
npm run reset-tables
```

## 🚢 デプロイ

### バックエンド（AWS Lambda）

Serverless Framework は廃止し、AWS SAM で Express を Lambda + HTTP API にデプロイします。

前提: AWS CLI と AWS SAM CLI がセットアップ済みで、認証済みであること。

```bash
cd hakkutsu-api

# 依存関係のインストール（初回のみ）
npm ci

# SAM ビルド
sam build

# 初回のみガイド付きデプロイ（プロンプトに従って StageName/JwtSecret などを設定）
sam deploy --guided

# 2回目以降は前回設定を流用
sam deploy
```

デプロイ後、出力 `ApiUrl` が API のベース URL です。

### フロントエンド（Vercel）

```bash
cd hakkutsu-front

# Vercelへデプロイ
vercel --prod
```

環境変数の設定例（フロントエンド）:

```
NEXT_PUBLIC_API_URL=<ApiUrl の値>  # 例: https://xxxxx.execute-api.ap-northeast-1.amazonaws.com
```

## 📝 API エンドポイント

### Users

- `GET /users/:userId` - ユーザー取得
- `POST /users` - ユーザー作成

### Matches

- `GET /matches` - 試合一覧取得
- `GET /matches/:matchId` - 試合詳細取得
- `POST /matches` - 試合作成

### User Matches

- `GET /user-matches?userId=:userId` - ユーザーの参加試合
- `POST /user-matches` - 試合参加登録

### Match Requests

- `GET /match-requests?userId=:userId` - リクエスト一覧
- `POST /match-requests` - リクエスト送信
- `PUT /match-requests/:requestId` - リクエスト承認/拒否

### Conversations & Messages

- `GET /conversations?userId=:userId` - 会話一覧
- `GET /conversations/:conversationId/messages` - メッセージ取得
- `POST /messages` - メッセージ送信

### Check-ins

- `POST /check-ins` - チェックイン
- `GET /check-ins?matchId=:matchId` - 試合のチェックイン一覧

### Reviews

- `POST /reviews` - レビュー投稿
- `GET /reviews?toUserId=:userId` - ユーザーのレビュー取得

詳細は [IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md) を参照してください。

## 🧪 テスト

### API のテスト（curl）

```bash
# 試合一覧取得
curl http://localhost:4000/matches

# 試合作成
curl -X POST http://localhost:4000/matches \
  -H "Content-Type: application/json" \
  -d '{
    "match_date": "2025-11-01T14:00:00Z",
    "opponent": "ロアッソ熊本",
    "venue": "ミクニワールドスタジアム北九州"
  }'
```

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは MIT ライセンスのもとで公開されています。

## 👥 チーム

- プロジェクトメンバー（記載予定）

## 🔗 リンク

- **本番環境（Front）**: https://hakkutsu-app.vercel.app
- **開発環境（Front）**: https://hakkutsu-app-taiyoyamada-tai09to06y-3264s-projects.vercel.app

## 📞 サポート

問題や質問がある場合は、以下を確認してください：

1. [実装ガイド](./docs/IMPLEMENTATION_GUIDE.md)
2. [データベース設計](./docs/DATABASE_DESIGN.md)
3. GitHub の Issues

---

**最終更新**: 2025-10-22
