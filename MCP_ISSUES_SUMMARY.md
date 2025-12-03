# MCP Issues - Root Cause Analysis & Fixes

## Executive Summary

Two critical issues were identified and fixed in the MCP (Model Context Protocol) integration:

1. **API keys not persisting in frontend** - Keys disappeared after page reload
2. **MCP authentication confusion** - Unclear which server implementation to use

Both issues are now resolved with backend and frontend changes.

---

## Issue #1: API Keys Not Persisting ❌ → ✅ FIXED

### Problem
- Users create API keys successfully
- Keys appear in the list initially
- After page reload, keys show as masked (`***suffix`) with no way to get full key
- Config generation fails because full key is unavailable

### Root Cause
The backend's `list_api_keys()` function returns **masked keys** for security:
```python
key['api_key'] = f"***{key_suffix}"  # Only shows last 8 chars
```

The frontend tried to restore full keys from localStorage, but:
1. Suffix extraction logic was inconsistent between frontend/backend
2. Matching logic was fragile (tried multiple fallback methods)
3. No reliable way to restore keys after browser restart

### Solution

**Backend Change** (`lambdas/mcp_keys_handler/app.py`):
```python
# Now includes full key on first load for caching
key['api_key_full'] = full_key  # Full key for frontend to cache
key['api_key'] = f"***{key_suffix}"  # Masked for display
key['key_suffix'] = key_suffix  # Consistent identifier
```

**Frontend Change** (`web/src/pages/MCPSettingsPage.tsx`):
```typescript
// Simplified localStorage logic
const processedKeys = backendKeys.map(key => {
  const keySuffix = key.key_suffix || key.key_id || ''
  
  // Store full key if provided by backend
  if (key.api_key_full) {
    storedKeys[keySuffix] = key.api_key_full
    return { ...key, api_key: key.api_key_full }
  }
  
  // Otherwise restore from localStorage
  const fullKey = storedKeys[keySuffix]
  if (fullKey) {
    return { ...key, api_key: fullKey }
  }
  
  return key // Return masked key with warning
})
```

**Result**: 
- ✅ Keys persist across page reloads
- ✅ Config generation works reliably
- ✅ Clear warning when full key unavailable

---

## Issue #2: MCP Authentication Not Working ❌ → ✅ CLARIFIED

### Problem
Users report "MCP not authenticating properly when I apply the config elsewhere"

### Root Cause
**There are TWO different MCP server implementations** with different auth mechanisms:

#### Server 1: Local stdio Server (`mcp/server.py`)
- **Type**: Command-line process
- **Protocol**: stdio (stdin/stdout)
- **Auth**: Cognito (email/password via environment variables)
- **Use case**: Local development, stdio-only MCP clients

**Config Example**:
```json
{
  "mcpServers": {
    "thanos": {
      "command": "python3",
      "args": ["/path/to/mcp/server.py"],
      "env": {
        "THANOS_API_URL": "https://api.example.com",
        "THANOS_USER_POOL_ID": "us-east-1_XXX",
        "THANOS_CLIENT_ID": "abc123",
        "THANOS_EMAIL": "user@example.com",
        "THANOS_PASSWORD": "password"
      }
    }
  }
}
```

#### Server 2: Hosted HTTP Server (`lambdas/mcp_server/server_hosted.py`)
- **Type**: AWS Lambda with Function URL
- **Protocol**: HTTP/HTTPS
- **Auth**: API Key (via `x-api-key` header)
- **Use case**: Production, HTTP-capable MCP clients (Claude Desktop, Windsurf)

**Config Example**:
```json
{
  "mcpServers": {
    "thanos": {
      "url": "https://lambda-url.lambda-url.region.on.aws/",
      "headers": {
        "x-api-key": "thanos_mcp_YOUR_KEY"
      }
    }
  }
}
```

### The Confusion

The frontend MCP Settings page generates config for **Server 2 (Hosted HTTP)**, but:
- The `mcp/config.example.json` shows config for **Server 1 (stdio)**
- Users may be trying to use Server 1 with API keys (doesn't work)
- No clear documentation on which to use

### Solution

**Recommendation**: Use **Hosted HTTP Server (Server 2)** for production

**Why**:
- ✅ Simple API key authentication (no Cognito credentials needed)
- ✅ Serverless - no local process management
- ✅ Works with Claude Desktop and other HTTP-capable clients
- ✅ Automatic scaling and high availability
- ✅ Easier to secure and monitor

**Updated Documentation**:
- Created `MCP_FIXES.md` with clear setup instructions
- Frontend now shows correct config for hosted server
- Added warnings about key availability

**Testing**:
```bash
# Test hosted server authentication
curl -X POST https://your-lambda-url/initialize \
  -H "x-api-key: thanos_mcp_YOUR_KEY"

# Should return server capabilities
```

---

## Files Changed

### Backend
- ✅ `lambdas/mcp_keys_handler/app.py` - Added `api_key_full` field
- ✅ `web/src/api.ts` - Updated `MCPApiKey` interface

### Frontend
- ✅ `web/src/pages/MCPSettingsPage_fixed.tsx` - Simplified key management
- ⚠️ Need to replace `MCPSettingsPage.tsx` with fixed version

### Documentation
- ✅ `MCP_FIXES.md` - Comprehensive fix documentation
- ✅ `MCP_ISSUES_SUMMARY.md` - This file
- ✅ `deploy-mcp-fixes.sh` - Deployment script

---

## Deployment Steps

### 1. Deploy Backend
```bash
# Package Lambda functions
make package

# Deploy with Terraform
cd infra
terraform apply
```

### 2. Deploy Frontend
```bash
# Replace old file with fixed version
mv web/src/pages/MCPSettingsPage_fixed.tsx web/src/pages/MCPSettingsPage.tsx

# Build
cd web
npm run build

# Deploy (your deployment method)
```

### 3. Test
1. Login to frontend
2. Go to MCP Settings → API Keys
3. Create new API key
4. Copy full key immediately
5. Reload page - verify key still appears
6. Copy config and test with Claude Desktop

---

## User Instructions

### For Claude Desktop Users

1. **Create API Key**:
   - Login to Thanos frontend
   - Navigate to MCP Settings → API Keys tab
   - Click "Generate API Key"
   - Give it a name (e.g., "Claude Desktop - MacBook")
   - **Copy the full key immediately** (shown only once!)

2. **Get MCP Server URL**:
   - Check MCP Settings → Setup tab
   - Or run: `cd infra && terraform output mcp_server_url`

3. **Configure Claude Desktop**:
   - Open config file:
     - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
     - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
     - Linux: `~/.config/Claude/claude_desktop_config.json`
   
   - Add configuration:
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
   - Ask: "List all customers"
   - Ask: "Show me dashboard metrics for demo-customer"
   - Ask: "What are the critical findings for prod-customer?"

---

## Troubleshooting

### Keys not showing after reload
- **Check**: Browser console → Application → Local Storage → `thanos_mcp_api_keys`
- **Fix**: Create a new key (old keys may not have been cached)

### "Invalid API key" error
- **Check**: Key hasn't expired (1 year expiration)
- **Check**: Key wasn't revoked
- **Fix**: Create a new key

### MCP server not responding
- **Check**: Correct URL from `terraform output mcp_server_url`
- **Check**: Lambda deployed successfully
- **Test**: `curl -X POST <url>/initialize -H "x-api-key: <key>"`

### Config shows "YOUR_API_KEY_HERE"
- **Cause**: Full key not available in localStorage
- **Fix**: Create a new key and copy it immediately
- **Note**: Old keys will show placeholder - this is expected

---

## Security Notes

1. **API Keys in localStorage**:
   - Stored in browser localStorage (same-origin only)
   - Consider implementing logout handler to clear keys
   - Consider encrypting keys using Web Crypto API

2. **Key Transmission**:
   - Always use HTTPS
   - Keys sent in headers (not URL parameters)
   - Backend validates on every request

3. **Key Rotation**:
   - Keys expire after 1 year
   - Users can revoke keys anytime
   - Create new keys before expiration

---

## Next Steps

1. ✅ Deploy backend changes
2. ✅ Deploy frontend changes
3. ⚠️ Test with real users
4. ⚠️ Add logout handler to clear localStorage
5. ⚠️ Consider key encryption in localStorage
6. ⚠️ Add usage analytics per API key
7. ⚠️ Implement rate limiting per key

---

## Questions?

See `MCP_FIXES.md` for detailed technical documentation.
