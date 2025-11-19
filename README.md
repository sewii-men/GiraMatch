# GiraMatch（ギラマッチ）

ギラヴァンツ北九州のファンが試合観戦の同行者を見つけるマッチングアプリ

## プロジェクト概要

**GiraMatch**は、サッカークラブ「ギラヴァンツ北九州」のファンが試合観戦を一緒に楽しむ仲間を見つけるためのモバイル Web アプリケーションです。観戦スタイルや座席の好みに基づいてマッチングし、チャット機能で事前にコミュニケーションを取り、試合後には相互評価を行うことで信頼性の高いコミュニティを形成します。

## 主な機能

- **試合一覧**: 今後の試合スケジュールを閲覧
- **マッチング**: 観戦スタイルや座席の好みに基づいて同行者を検索
- **チャット**: マッチした相手と 1 対 1 またはグループでメッセージ交換
- **チェックイン**: スタジアム到着時にチェックイン
- **レビューシステム**: 試合後に相手を評価し、信頼スコアを構築

## アーキテクチャ

### 技術スタック

| レイヤー           | 技術                                           |
| ------------------ | ---------------------------------------------- |
| **フロントエンド** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **バックエンド**   | Node.js, Express, AWS SAM                      |
| **データベース**   | AWS DynamoDB                                   |
| **インフラ**       | AWS Lambda, API Gateway, Vercel                |
| **開発環境**       | Docker Compose, DynamoDB Local                 |
## 開発

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

## デプロイ

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

