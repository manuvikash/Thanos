# MCP Issues - Quick Fix Guide

## 🔴 Problem 1: API Keys Not Persisting

**Symptom**: Keys disappear or show as `***suffix` after page reload

**Fix Applied**:
- ✅ Backend now sends full key on first load (`api_key_full` field)
- ✅ Frontend stores keys reliably in localStorage by suffix
- ✅ Clear warning when full key unavailable

**Deploy**:
```bash
make package
cd infra && terraform apply
```

---

## 🔴 Problem 2: MCP Authentication Confusion

**Symptom**: "MCP not authenticating properly when I apply the config elsewhere"

**Root Cause**: Two different MCP servers with different auth methods

### ✅ RECOMMENDED: Use Hosted HTTP Server

**Config for Claude Desktop**:
```json
{
  "mcpServers": {
    "thanos": {
      "url": "https://YOUR_LAMBDA_URL",
      "headers": {
        "x-api-key": "thanos_mcp_YOUR_KEY"
      }
    }
  }
}
```

**Get Lambda URL**:
```bash
cd infra
terraform output mcp_server_url
```

**Create API Key**:
1. Login to frontend
2. MCP Settings → API Keys → Generate
3. Copy full key immediately!

---

## 🚀 Quick Deploy

```bash
# 1. Package and deploy backend
make package
cd infra && terraform apply

# 2. Update frontend
mv web/src/pages/MCPSettingsPage_fixed.tsx web/src/pages/MCPSettingsPage.tsx
cd web && npm run build

# 3. Get MCP URL
cd infra && terraform output mcp_server_url

# 4. Create API key in frontend and configure Claude
```

---

## 🧪 Quick Test

```bash
# Test MCP server
curl -X POST https://YOUR_LAMBDA_URL/initialize \
  -H "x-api-key: thanos_mcp_YOUR_KEY" \
  -H "Content-Type: application/json"

# Should return:
# {"protocolVersion":"2024-11-05","capabilities":{...}}
```

---

## 📋 Checklist

- [ ] Backend deployed (`terraform apply`)
- [ ] Frontend updated (replaced `MCPSettingsPage.tsx`)
- [ ] Frontend built and deployed (`npm run build`)
- [ ] MCP server URL obtained (`terraform output`)
- [ ] API key created in frontend
- [ ] Claude Desktop configured
- [ ] Claude Desktop restarted
- [ ] Tested with "List all customers"

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Keys not persisting | Create new key, check localStorage in browser console |
| Invalid API key | Create new key, check it hasn't expired |
| MCP not responding | Verify Lambda URL, test with curl |
| Config shows placeholder | Create new key and copy immediately |

---

## 📚 Full Documentation

- **Detailed fixes**: `MCP_FIXES.md`
- **Root cause analysis**: `MCP_ISSUES_SUMMARY.md`
- **Deployment script**: `deploy-mcp-fixes.sh`

---

## ⚡ TL;DR

1. **Backend**: Returns full keys on first load for caching
2. **Frontend**: Stores keys reliably, shows warnings when unavailable
3. **MCP Auth**: Use hosted HTTP server with API key (not stdio with Cognito)
4. **Deploy**: `make package && cd infra && terraform apply`
5. **Test**: Create key → Configure Claude → Restart → Ask questions
