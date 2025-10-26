<!--
title: 'Express API on AWS Lambda with DynamoDB (AWS SAM)'
description: 'Express + DynamoDB running on AWS Lambda behind API Gateway, deployed with AWS SAM.'
layout: Doc
platform: AWS
language: nodeJS
priority: 1
-->

# Express API on AWS Lambda (via AWS SAM)

This service runs an Express application on AWS Lambda behind an Amazon API Gateway HTTP API. Deployment uses AWS SAM (not Serverless Framework).

We use the `serverless-http` adapter to translate API Gateway events to Express requests. This adapter library is unrelated to the Serverless Framework.

## Usage

### Deployment (AWS SAM)

```
npm ci
sam build
sam deploy --guided
```

After running deploy, you should see output similar to:

```
Deploying "aws-node-express-dynamodb-api" to stage "dev" (ap-northeast-1)

✔ Service deployed to stack aws-node-express-dynamodb-api-dev (109s)

endpoint: ANY - https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com
functions:
  api: aws-node-express-dynamodb-api-dev-api (3.8 MB)
```

Note: In the current template, the API is public. For production, consider adding an authorizer to API Gateway and secrets management for JWT.

### Admin login (bootstrap)

This API supports a bootstrap admin login via environment variables. Set these parameters at deploy time:

- `AdminEmail` (maps to `ADMIN_EMAIL`) — default: `admin@test.com`
- `AdminPassword` (maps to `ADMIN_PASSWORD`, NoEcho) — default: `secret0101`

On first successful login with these credentials, the API will upsert a user with `isAdmin: true` and store a password hash in DynamoDB. If you later rotate `AdminPassword`, the next login will re-sync the stored hash.

For production, use strong values and manage secrets securely (e.g., AWS Secrets Manager + SAM parameter overrides).

### Invocation

After successful deployment, you can create a new user by calling the corresponding endpoint:

```
curl --request POST 'https://xxxxxx.execute-api.ap-northeast-1.amazonaws.com/users' --header 'Content-Type: application/json' --data-raw '{"name": "John", "userId": "someUserId"}'
```

Which should result in the following response:

```json
{ "userId": "someUserId", "name": "John" }
```

You can later retrieve the user by `userId` by calling the following endpoint:

```
curl https://xxxxxxx.execute-api.ap-northeast-1.amazonaws.com/users/someUserId
```

Which should result in the following response:

```json
{ "userId": "someUserId", "name": "John" }
```

### Local development

For local API + DynamoDB Local, use Docker Compose at the repository root:

```
docker compose up --build
```

It runs `node local.js` inside the container and exposes `http://localhost:4000`.

The local Docker service passes `ADMIN_EMAIL` and `ADMIN_PASSWORD` by default (see root `docker-compose.yml`). Update your `.env` to override if needed.
