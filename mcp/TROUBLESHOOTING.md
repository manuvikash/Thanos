# MCP Server Troubleshooting Guide

## API Key Persistence Issues

### Problem: API keys disappear on page refresh

**Root Cause**: Frontend stores full keys in localStorage, but matching logic wasn't consistent with backend suffix format.

**Solution Implemented**:
1. Backend returns `key_suffix` field in API key list response
2. Frontend stores keys in localStorage using suffix as key: `{suffix: fullKey}`
3. Matching uses `key_suffix` field from backend first, then falls back to parsing `***{suffix}` format
4. Added comprehensive logging to debug matching issues

**To Debug**:
1. Open browser console
2. Create a new API key
3. Check console for: `✅ Stored API key with suffix: {suffix}`
4. Refresh page
5. Check console for: `🔍 Matching key` messages
6. Verify `hasMatch: true` in the logs

**Manual Test**:
```javascript
// In browser console:
localStorage.getItem('thanos_mcp_api_keys')
// Should show: {"{suffix}": "{fullApiKey}"}
```

## Server 404 Errors

### Problem: "failed to register client: registration request failed with status 404"

**Root Cause**: Client trying to access `/register` endpoint that wasn't properly configured or path matching was incorrect.

**Solution Implemented**:
1. Added `/mcp/register` endpoint (GET and POST) in API Gateway
2. Added `handle_register()` function in Lambda
3. Registration endpoint works without API key (for initial client setup)
4. Improved path normalization to handle `/mcp` prefix correctly
5. Added OPTIONS handler for CORS preflight

**Endpoints Available**:
- `GET /mcp/initialize` - Server initialization
- `POST /mcp/initialize` - Server initialization (POST variant)
- `GET /mcp/register` - Client registration
- `POST /mcp/register` - Client registration (POST variant)
- `POST /mcp/messages` - MCP protocol messages
- `GET /mcp/sse` - Server-Sent Events stream

**To Verify Deployment**:
```bash
# Check if routes are deployed
cd infra
terraform output mcp_api_endpoint

# Test registration endpoint
curl -X POST https://YOUR_API_ID.execute-api.REGION.amazonaws.com/mcp/register \
  -H "Content-Type: application/json" \
  -d '{}'

# Should return: {"status": "registered", ...}
```

## Common Issues

### 1. API Key Not Persisting

**Check**:
- Browser console for storage logs
- localStorage in DevTools → Application → Local Storage
- Verify suffix matching in console logs

**Fix**: Clear localStorage and create new key:
```javascript
localStorage.removeItem('thanos_mcp_api_keys')
```

### 2. Server Returns 404

**Check**:
- Terraform outputs show correct endpoint
- API Gateway routes are deployed
- Lambda function is updated

**Fix**: Redeploy:
```bash
make tf-apply
```

### 3. CORS Errors

**Check**: Server returns proper CORS headers

**Fix**: Already implemented - OPTIONS handler returns CORS headers

## Debugging Steps

1. **Check Backend Response**:
   ```bash
   # Get API keys (requires auth)
   curl -X GET https://YOUR_API/mcp/keys \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Check Frontend Storage**:
   - Open DevTools → Console
   - Look for storage/matching logs
   - Check Application → Local Storage

3. **Check Server Logs**:
   ```bash
   aws logs tail /aws/lambda/YOUR_FUNCTION_NAME --follow
   ```

4. **Test Registration**:
   ```bash
   curl -X POST https://YOUR_API/mcp/register \
     -H "Content-Type: application/json"
   ```

