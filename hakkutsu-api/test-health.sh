#!/bin/bash
set -euo pipefail

# Health check script for local testing
API_URL="${1:-http://localhost:4000}"

echo "Testing API at $API_URL"
echo "================================"

# Test root endpoint
echo -e "\n1. Testing root endpoint..."
ROOT_RESPONSE=$(curl -sS -w "\nHTTP_CODE:%{http_code}" "$API_URL/")
echo "$ROOT_RESPONSE"

# Test /matching/recruitments endpoint
echo -e "\n2. Testing /matching/recruitments endpoint..."
RECRUIT_RESPONSE=$(curl -sS -w "\nHTTP_CODE:%{http_code}" "$API_URL/matching/recruitments")
echo "$RECRUIT_RESPONSE"

echo -e "\n================================"
echo "Health check complete"
