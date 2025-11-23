#!/bin/bash

# Test MCP Server Authentication
# This script tests if the MCP server is properly authenticating API keys

MCP_URL="https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws"

echo "🧪 Testing MCP Server Authentication"
echo "======================================"
echo ""
echo "MCP Server URL: $MCP_URL"
echo ""

# Test 1: Initialize without API key (should fail)
echo "Test 1: Initialize without API key (should return 401)"
echo "------------------------------------------------------"
curl -X POST "$MCP_URL/initialize" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 2: Initialize with invalid API key (should fail)
echo "Test 2: Initialize with invalid API key (should return 401)"
echo "-----------------------------------------------------------"
curl -X POST "$MCP_URL/initialize" \
  -H "Content-Type: application/json" \
  -H "x-api-key: invalid_key_12345" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

# Test 3: Check if you have an API key
echo "Test 3: You need to create an API key in the frontend"
echo "------------------------------------------------------"
echo "1. Go to: http://localhost:5173 (or your frontend URL)"
echo "2. Login"
echo "3. Navigate to: MCP Settings → API Keys"
echo "4. Click 'Generate API Key'"
echo "5. Copy the full key (starts with 'thanos_mcp_')"
echo ""
echo "Then run this command to test:"
echo ""
echo "  curl -X POST '$MCP_URL/initialize' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'x-api-key: YOUR_API_KEY_HERE'"
echo ""
echo ""

# Test 4: Check server health
echo "Test 4: Check if server is reachable"
echo "------------------------------------"
curl -X OPTIONS "$MCP_URL/initialize" \
  -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: x-api-key" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s -v 2>&1 | grep -E "(HTTP|Access-Control)"
echo ""
echo ""

echo "✅ Tests complete!"
echo ""
echo "Next steps:"
echo "1. Create an API key in the frontend"
echo "2. Test with: curl -X POST '$MCP_URL/initialize' -H 'x-api-key: YOUR_KEY'"
echo "3. Expected response: {\"protocolVersion\":\"2024-11-05\",...}"
