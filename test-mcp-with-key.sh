#!/bin/bash

# Test MCP Server with API Key
# Usage: ./test-mcp-with-key.sh YOUR_API_KEY

if [ -z "$1" ]; then
  echo "❌ Error: API key required"
  echo ""
  echo "Usage: ./test-mcp-with-key.sh YOUR_API_KEY"
  echo ""
  echo "To get an API key:"
  echo "1. Go to the frontend (http://localhost:5173)"
  echo "2. Login"
  echo "3. Navigate to: MCP Settings → API Keys"
  echo "4. Click 'Generate API Key'"
  echo "5. Copy the full key"
  echo ""
  exit 1
fi

API_KEY="$1"
MCP_URL="https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws"

echo "🧪 Testing MCP Server with API Key"
echo "===================================="
echo ""
echo "MCP Server URL: $MCP_URL"
echo "API Key: ${API_KEY:0:20}...${API_KEY: -8}"
echo ""

# Test 1: Initialize
echo "Test 1: Initialize endpoint"
echo "---------------------------"
RESPONSE=$(curl -X POST "$MCP_URL/initialize" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -w "\n%{http_code}" \
  -s)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Initialize: SUCCESS"
else
  echo "❌ Initialize: FAILED"
fi
echo ""

# Test 2: Tools List
echo "Test 2: Tools list endpoint"
echo "---------------------------"
RESPONSE=$(curl -X POST "$MCP_URL/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }' \
  -w "\n%{http_code}" \
  -s)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.result.tools | length' 2>/dev/null && echo "tools available" || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Tools list: SUCCESS"
else
  echo "❌ Tools list: FAILED"
fi
echo ""

# Test 3: Resources List
echo "Test 3: Resources list endpoint"
echo "-------------------------------"
RESPONSE=$(curl -X POST "$MCP_URL/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "resources/list",
    "id": 2
  }' \
  -w "\n%{http_code}" \
  -s)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.result.resources | length' 2>/dev/null && echo "resources available" || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Resources list: SUCCESS"
else
  echo "❌ Resources list: FAILED"
fi
echo ""

echo "======================================"
echo "Summary:"
echo "======================================"
echo ""
echo "If all tests passed, your MCP server is working correctly!"
echo ""
echo "To use with Claude Desktop, add this to your config:"
echo ""
echo '{'
echo '  "mcpServers": {'
echo '    "thanos": {'
echo "      \"url\": \"$MCP_URL\","
echo '      "headers": {'
echo "        \"x-api-key\": \"$API_KEY\""
echo '      }'
echo '    }'
echo '  }'
echo '}'
echo ""
