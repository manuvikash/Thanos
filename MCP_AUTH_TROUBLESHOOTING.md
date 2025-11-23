# MCP Authentication Troubleshooting Guide

## Current Status

Based on your screenshot, you're seeing authentication errors when trying to use the MCP server.

## Issue Identified

**Problem**: Wrong MCP server URL in configuration

**Your Terraform Output**:
```
https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/
```

**Your .env file had** (WRONG):
```
VITE_MCP_SERVER_URL=https://s9vvtq1ys6.execute-api.us-west-1.amazonaws.com/mcp
```

**Fixed to** (CORRECT):
```
VITE_MCP_SERVER_URL=https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws
```

## Quick Fix Steps

### 1. Update Frontend Environment
✅ Already done - I updated `web/.env` with the correct URL

### 2. Rebuild Frontend
```bash
cd web
npm run build
```

### 3. Create an API Key

**In the frontend**:
1. Go to http://localhost:5173 (or your deployed URL)
2. Login
3. Navigate to: **MCP Settings → API Keys**
4. Enter a name (e.g., "Kiro IDE")
5. Click **"Generate API Key"**
6. **COPY THE FULL KEY IMMEDIATELY** (starts with `thanos_mcp_`)

### 4. Test the MCP Server

```bash
# Make script executable
chmod +x test-mcp-with-key.sh

# Test with your API key
./test-mcp-with-key.sh thanos_mcp_YOUR_KEY_HERE
```

**Expected output**:
```
✅ Initialize: SUCCESS
✅ Tools list: SUCCESS
✅ Resources list: SUCCESS
```

### 5. Configure Kiro IDE

**Option A: Using Kiro's MCP Settings**

If you're using Kiro IDE, you need to configure the MCP server in Kiro's settings.

Based on your screenshot showing "Custom MCP Server", you need to:

1. Open Kiro IDE settings
2. Find MCP configuration
3. Add your Thanos MCP server:
   - **URL**: `https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws`
   - **Headers**: `x-api-key: thanos_mcp_YOUR_KEY_HERE`

**Option B: Using Claude Desktop Config**

If you're using Claude Desktop, edit the config file:

**Location**:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Content**:
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

## Common Issues & Solutions

### Issue 1: "Invalid or inactive API key"

**Causes**:
- API key not created yet
- API key expired (1 year expiration)
- API key revoked
- Wrong API key format

**Solution**:
1. Create a new API key in the frontend
2. Copy the FULL key (not the masked version)
3. Verify it starts with `thanos_mcp_`
4. Test with curl:
   ```bash
   curl -X POST "https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/initialize" \
     -H "Content-Type: application/json" \
     -H "x-api-key: thanos_mcp_YOUR_KEY"
   ```

### Issue 2: "Missing x-api-key header"

**Causes**:
- API key not included in request
- Wrong header name
- Configuration not loaded

**Solution**:
1. Verify your config includes the `headers` section
2. Header name must be exactly: `x-api-key` (lowercase)
3. Restart your IDE/application after config change

### Issue 3: "Connection refused" or "Network error"

**Causes**:
- Wrong URL
- Lambda not deployed
- Network/firewall issues

**Solution**:
1. Verify Lambda URL from Terraform:
   ```bash
   cd infra
   terraform output mcp_server_url
   ```
2. Test with curl to verify it's reachable
3. Check AWS Lambda console to verify function exists

### Issue 4: Keys disappearing from frontend

**Status**: ✅ FIXED in `web/src/pages/MCPSettingsPage.tsx`

**If still happening**:
1. Rebuild frontend: `cd web && npm run build`
2. Clear browser cache
3. Create a new key

### Issue 5: Backend not returning api_key_full

**Status**: ✅ FIXED in `lambdas/mcp_keys_handler/app.py`

**If still happening**:
1. Deploy backend:
   ```bash
   make package
   cd infra
   terraform apply
   ```

## Verification Steps

### Step 1: Verify Lambda is Deployed
```bash
cd infra
terraform output mcp_server_url
# Should return: https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/
```

### Step 2: Verify DynamoDB Table Exists
```bash
aws dynamodb describe-table --table-name thanos-mcp-keys --region us-west-1
```

### Step 3: Test Server Without Auth (Should Fail)
```bash
curl -X POST "https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/initialize" \
  -H "Content-Type: application/json"

# Expected: {"jsonrpc":"2.0","error":{"code":-32000,"message":"Missing x-api-key header"},"id":null}
```

### Step 4: Create API Key in Frontend
1. Login to frontend
2. Go to MCP Settings → API Keys
3. Create key
4. Copy full key

### Step 5: Test Server With Auth (Should Succeed)
```bash
curl -X POST "https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/initialize" \
  -H "Content-Type: application/json" \
  -H "x-api-key: thanos_mcp_YOUR_KEY"

# Expected: {"protocolVersion":"2024-11-05","capabilities":{...}}
```

### Step 6: Check CloudWatch Logs
```bash
# View Lambda logs
aws logs tail /aws/lambda/thanos-mcp-server --follow --region us-west-1

# Look for:
# - "Authenticated request from user@example.com"
# - "Invalid API key" (if auth failing)
# - "Missing x-api-key header" (if header not sent)
```

## Debug Checklist

- [ ] Lambda deployed (`terraform output mcp_server_url` works)
- [ ] DynamoDB table exists (`thanos-mcp-keys`)
- [ ] Frontend `.env` has correct URL
- [ ] Frontend rebuilt after `.env` change
- [ ] API key created in frontend
- [ ] Full API key copied (not masked version)
- [ ] Config file has correct URL and key
- [ ] IDE/application restarted after config change
- [ ] Test with curl succeeds
- [ ] CloudWatch logs show authentication

## Quick Test Commands

```bash
# 1. Test server is reachable
curl -I https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/initialize

# 2. Test without auth (should fail with 401)
curl -X POST https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/initialize \
  -H "Content-Type: application/json"

# 3. Test with auth (should succeed with 200)
curl -X POST https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/initialize \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY_HERE"

# 4. Test tools list
curl -X POST https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY_HERE" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## Expected Responses

### Initialize (Success)
```json
{
  "protocolVersion": "2024-11-05",
  "capabilities": {
    "tools": {"listChanged": true},
    "resources": {"subscribe": true, "listChanged": true}
  },
  "serverInfo": {
    "name": "thanos-mcp-server",
    "version": "1.0.0",
    "description": "Thanos Cloud Compliance Platform MCP Server"
  },
  "instructions": "Use this server to query cloud infrastructure..."
}
```

### Initialize (Missing API Key)
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Missing x-api-key header"
  },
  "id": null
}
```

### Initialize (Invalid API Key)
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Invalid or inactive API key"
  },
  "id": null
}
```

## Next Steps

1. ✅ Frontend `.env` updated with correct URL
2. ⚠️ **Rebuild frontend**: `cd web && npm run build`
3. ⚠️ **Create API key** in frontend
4. ⚠️ **Test with curl** using the test scripts
5. ⚠️ **Configure your IDE** with the API key
6. ⚠️ **Restart your IDE**
7. ⚠️ **Test MCP functionality**

## Support

If issues persist:
1. Check CloudWatch logs for Lambda errors
2. Verify DynamoDB table has your API key
3. Test with curl to isolate the issue
4. Check browser console for frontend errors
5. Review `MCP_VERIFICATION_REPORT.md` for detailed verification steps
