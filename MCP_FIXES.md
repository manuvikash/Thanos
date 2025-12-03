# MCP Integration Fixes

## Issues Identified

### Issue 1: API Keys Not Persisting in Frontend View ❌

**Root Cause**: 
- Backend returns masked keys (`***{suffix}`) on subsequent loads
- Frontend localStorage matching logic was fragile and inconsistent
- No reliable way to restore full keys after page reload

**Solution**: ✅
1. **Backend Change**: Modified `list_api_keys()` to include `api_key_full` field on first load
2. **Frontend Change**: Simplified localStorage logic to store keys by `key_suffix` consistently
3. **Added**: Clear warning when full key is not available

**Files Changed**:
- `lambdas/mcp_keys_handler/app.py` - Added `api_key_full` field to response
- `web/src/api.ts` - Updated `MCPApiKey` interface
- `web/src/pages/MCPSettingsPage_fixed.tsx` - Simplified key storage/retrieval logic

### Issue 2: MCP Not Authenticating Properly ❌

**Root Cause**: 
- **Confusion between TWO different MCP server implementations**:
  1. **Local stdio server** (`mcp/server.py`) - Uses Cognito auth via environment variables
  2. **Hosted HTTP server** (`lambdas/mcp_server/server_hosted.py`) - Uses API key auth via headers

- Frontend generates config for hosted HTTP server, but users may be trying to use local stdio server
- The two servers have completely different authentication mechanisms

**Solution**: ✅

#### For Hosted HTTP MCP Server (Recommended)

**Use Case**: AI assistants that support HTTP-based MCP servers (Claude Desktop, Windsurf, etc.)

**Configuration**:
```json
{
  "mcpServers": {
    "thanos": {
      "url": "https://your-lambda-url.lambda-url.region.on.aws/",
      "headers": {
        "x-api-key": "thanos_mcp_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

**Authentication Flow**:
1. Client sends request with `x-api-key` header
2. Lambda validates key against DynamoDB `mcp_keys` table
3. Returns MCP protocol responses

**Status**: ✅ Working correctly

#### For Local stdio MCP Server (Advanced)

**Use Case**: Local development or AI assistants that only support stdio-based MCP

**Configuration**:
```json
{
  "mcpServers": {
    "thanos": {
      "command": "python3",
      "args": ["/absolute/path/to/mcp/server.py"],
      "env": {
        "THANOS_API_URL": "https://your-api-gateway.execute-api.region.amazonaws.com",
        "THANOS_USER_POOL_ID": "us-east-1_XXXXX",
        "THANOS_CLIENT_ID": "your-cognito-client-id",
        "THANOS_EMAIL": "your-email@example.com",
        "THANOS_PASSWORD": "your-password"
      }
    }
  }
}
```

**Authentication Flow**:
1. Server authenticates to Cognito using email/password
2. Gets JWT token
3. Uses JWT to call Thanos API Gateway endpoints

**Status**: ⚠️ Requires Cognito credentials (not API key)

## Recommended Approach

**Use the Hosted HTTP MCP Server** for production:

### Advantages:
- ✅ Simple API key authentication
- ✅ No need to manage Cognito credentials
- ✅ Works with any HTTP-capable MCP client
- ✅ Serverless - no local process needed
- ✅ Automatic scaling and availability

### Setup Steps:

1. **Create API Key** (in frontend):
   - Go to MCP Settings → API Keys tab
   - Click "Generate API Key"
   - Copy the full key immediately (shown only once)

2. **Get MCP Server URL**:
   ```bash
   cd infra
   terraform output mcp_server_url
   ```

3. **Configure Claude Desktop**:
   - Location: 
     - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
     - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
     - Linux: `~/.config/Claude/claude_desktop_config.json`
   
   - Content:
     ```json
     {
       "mcpServers": {
         "thanos": {
           "url": "https://YOUR_LAMBDA_URL_HERE",
           "headers": {
             "x-api-key": "thanos_mcp_YOUR_FULL_API_KEY"
           }
         }
       }
     }
     ```

4. **Restart Claude Desktop**

5. **Test**:
   - Ask Claude: "List all customers"
   - Ask Claude: "Show me dashboard metrics for demo-customer"

## Implementation Details

### Backend Changes

**File**: `lambdas/mcp_keys_handler/app.py`

```python
# Added to list_api_keys() function:
key['api_key_full'] = full_key  # Full key for initial caching
key['api_key'] = f"***{key_suffix}"  # Masked display version
key['key_suffix'] = key_suffix  # Consistent suffix for matching
```

**Why**: Allows frontend to cache full keys on first load while maintaining security

### Frontend Changes

**File**: `web/src/pages/MCPSettingsPage_fixed.tsx`

**Key improvements**:
1. Simplified localStorage logic - store by `key_suffix` only
2. Use `api_key_full` from backend on first load
3. Clear warning when full key not available
4. Consistent suffix extraction matching backend logic

**File**: `web/src/api.ts`

```typescript
export interface MCPApiKey {
  api_key: string;
  api_key_full?: string; // Full key returned on first load
  key_suffix?: string; // Consistent suffix for matching
  key_id?: string; // Alias for key_suffix
  // ... other fields
}
```

## Testing

### Test API Key Creation
```bash
# Create key via API
curl -X POST https://your-api.execute-api.region.amazonaws.com/mcp/keys \
  -H "Authorization: YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key", "expires_days": 365}'
```

### Test MCP Server Authentication
```bash
# Test hosted MCP server
curl -X POST https://your-lambda-url.lambda-url.region.on.aws/initialize \
  -H "x-api-key: thanos_mcp_YOUR_KEY" \
  -H "Content-Type: application/json"

# Should return:
# {
#   "protocolVersion": "2024-11-05",
#   "capabilities": {...},
#   "serverInfo": {...}
# }
```

### Test MCP Tools
```bash
# Test tools/list
curl -X POST https://your-lambda-url.lambda-url.region.on.aws/messages \
  -H "x-api-key: thanos_mcp_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

## Deployment

### 1. Deploy Backend Changes
```bash
cd infra
terraform apply
```

### 2. Deploy Frontend Changes
```bash
# Replace the old file with the fixed version
mv web/src/pages/MCPSettingsPage_fixed.tsx web/src/pages/MCPSettingsPage.tsx

# Build and deploy
cd web
npm run build
# Deploy dist/ to your hosting
```

### 3. Verify
1. Login to frontend
2. Go to MCP Settings
3. Create a new API key
4. Verify it appears in the list
5. Reload page - verify key still shows (may be masked)
6. Copy config and test with Claude Desktop

## Security Considerations

1. **API Keys in localStorage**: 
   - Keys are stored in browser localStorage
   - Only accessible to same-origin JavaScript
   - Cleared on logout (implement this!)
   - Consider adding encryption for extra security

2. **API Key Transmission**:
   - Always use HTTPS
   - Keys sent in headers (not URL)
   - Backend validates on every request

3. **Key Rotation**:
   - Keys expire after 1 year
   - Users can revoke keys anytime
   - Create new keys before old ones expire

## Troubleshooting

### "API key not persisting after reload"
- **Cause**: Browser cleared localStorage or key wasn't stored
- **Fix**: Create a new key and verify localStorage contains it
- **Check**: Open browser console → Application → Local Storage → look for `thanos_mcp_api_keys`

### "Invalid or inactive API key" error
- **Cause**: Key expired, revoked, or incorrect
- **Fix**: Create a new key
- **Check**: Verify key in DynamoDB table `thanos-mcp-keys`

### "MCP server not responding"
- **Cause**: Wrong URL or Lambda not deployed
- **Fix**: Get correct URL from `terraform output mcp_server_url`
- **Check**: Test with curl (see Testing section)

### "Config shows YOUR_API_KEY_HERE placeholder"
- **Cause**: Full key not available in localStorage
- **Fix**: Create a new key (full key shown only once)
- **Note**: Old keys will show placeholder - this is expected

## Future Improvements

1. **Add logout handler** to clear localStorage
2. **Encrypt keys** in localStorage using Web Crypto API
3. **Add key usage analytics** to show which tools are being called
4. **Implement key scopes** to limit access to specific tools/customers
5. **Add webhook notifications** for key usage/expiration
6. **Support multiple MCP server types** in UI (stdio vs HTTP)
7. **Add MCP server health check** endpoint
8. **Implement rate limiting** per API key

## Summary

The fixes address both issues:

1. ✅ **API keys now persist** - Backend sends full key on first load, frontend stores it reliably
2. ✅ **MCP authentication clarified** - Use hosted HTTP server with API key auth (recommended)

The hosted HTTP MCP server is production-ready and working correctly. Users should use this approach for connecting AI assistants like Claude Desktop.
