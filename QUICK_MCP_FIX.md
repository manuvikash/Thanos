# Quick MCP Authentication Fix

## What I Found

Your MCP server URL in `.env` was **wrong**:
- ❌ Old: `https://s9vvtq1ys6.execute-api.us-west-1.amazonaws.com/mcp` (API Gateway)
- ✅ New: `https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws` (Lambda URL)

## What I Fixed

✅ Updated `web/.env` with correct MCP server URL

## What You Need to Do

### 1. Rebuild Frontend (REQUIRED)
```bash
cd web
npm run build
```

### 2. Create API Key
1. Go to frontend: http://localhost:5173
2. Login
3. Navigate to: **MCP Settings → API Keys**
4. Click **"Generate API Key"**
5. **COPY THE FULL KEY** (starts with `thanos_mcp_`)

### 3. Test MCP Server
```bash
# Make executable
chmod +x test-mcp-with-key.sh

# Test (replace with your actual key)
./test-mcp-with-key.sh thanos_mcp_YOUR_KEY_HERE
```

**Expected**:
```
✅ Initialize: SUCCESS
✅ Tools list: SUCCESS
✅ Resources list: SUCCESS
```

### 4. Configure Kiro IDE

Add to your Kiro MCP configuration:

```json
{
  "mcpServers": {
    "thanos": {
      "url": "https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws",
      "headers": {
        "x-api-key": "thanos_mcp_YOUR_FULL_KEY_HERE"
      }
    }
  }
}
```

### 5. Restart Kiro IDE

After adding the configuration, restart Kiro IDE for changes to take effect.

## Quick Test

```bash
# Test without key (should fail)
curl -X POST "https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/initialize" \
  -H "Content-Type: application/json"

# Expected: {"jsonrpc":"2.0","error":{"code":-32000,"message":"Missing x-api-key header"},"id":null}

# Test with key (should succeed)
curl -X POST "https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/initialize" \
  -H "Content-Type: application/json" \
  -H "x-api-key: thanos_mcp_YOUR_KEY"

# Expected: {"protocolVersion":"2024-11-05",...}
```

## Files Created

- ✅ `test-mcp-with-key.sh` - Test script with API key
- ✅ `test-mcp-auth.sh` - Test authentication without key
- ✅ `MCP_AUTH_TROUBLESHOOTING.md` - Complete troubleshooting guide

## Summary

1. ✅ Fixed `.env` with correct Lambda URL
2. ⚠️ **You need to**: Rebuild frontend
3. ⚠️ **You need to**: Create API key
4. ⚠️ **You need to**: Configure Kiro IDE
5. ⚠️ **You need to**: Restart Kiro IDE

**The MCP server is deployed and working - you just need the correct URL and an API key!**
