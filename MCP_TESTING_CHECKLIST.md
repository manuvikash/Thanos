# MCP Testing Checklist

## Pre-Deployment Testing

### Backend Tests

- [ ] **Lambda Package Build**
  ```bash
  make package
  # Verify dist/mcp_keys_handler.zip exists
  # Verify dist/mcp_server.zip exists
  ```

- [ ] **Terraform Plan**
  ```bash
  cd infra
  terraform plan
  # Review changes to:
  # - aws_lambda_function.mcp_keys
  # - aws_lambda_function.mcp_server
  # - aws_dynamodb_table.mcp_keys
  ```

- [ ] **DynamoDB Table Structure**
  ```bash
  aws dynamodb describe-table --table-name thanos-mcp-keys
  # Verify:
  # - hash_key: api_key
  # - GSI: user-email-index
  # - TTL enabled on expires_at
  ```

### Frontend Tests

- [ ] **TypeScript Compilation**
  ```bash
  cd web
  npm run build
  # Should complete without errors
  ```

- [ ] **File Replacement**
  ```bash
  # Backup original
  cp web/src/pages/MCPSettingsPage.tsx web/src/pages/MCPSettingsPage.tsx.backup
  
  # Replace with fixed version
  mv web/src/pages/MCPSettingsPage_fixed.tsx web/src/pages/MCPSettingsPage.tsx
  
  # Verify no TypeScript errors
  npm run build
  ```

---

## Post-Deployment Testing

### 1. API Key Management Tests

#### Test 1.1: Create API Key
- [ ] Login to frontend
- [ ] Navigate to MCP Settings → API Keys tab
- [ ] Enter key name: "Test Key 1"
- [ ] Click "Generate API Key"
- [ ] **Verify**: Full key displayed in green alert
- [ ] **Verify**: Key format: `thanos_mcp_[random_string]`
- [ ] Copy key to clipboard
- [ ] **Verify**: Key appears in list below

#### Test 1.2: Key Persistence
- [ ] Reload page (F5)
- [ ] Navigate back to MCP Settings → API Keys
- [ ] **Verify**: Key still appears in list
- [ ] **Verify**: Key shows as `thanos_mcp_***[suffix]` OR full key
- [ ] **Verify**: No error messages

#### Test 1.3: localStorage Verification
- [ ] Open browser DevTools (F12)
- [ ] Go to Application → Local Storage
- [ ] Find key: `thanos_mcp_api_keys`
- [ ] **Verify**: JSON object with key suffixes as keys
- [ ] **Verify**: Full keys as values
- [ ] Example:
  ```json
  {
    "abc12345": "thanos_mcp_full_key_here...",
    "def67890": "thanos_mcp_another_key..."
  }
  ```

#### Test 1.4: Config Generation
- [ ] Click "Config" button next to a key
- [ ] **Verify**: Config copied to clipboard
- [ ] Paste into text editor
- [ ] **Verify**: Contains full API key (not placeholder)
- [ ] **Verify**: Contains correct Lambda URL
- [ ] **Verify**: Valid JSON format

#### Test 1.5: Key Revocation
- [ ] Click trash icon next to a key
- [ ] Confirm deletion
- [ ] **Verify**: Key removed from list
- [ ] **Verify**: Key removed from localStorage
- [ ] **Verify**: Revoked key no longer works (test with curl)

---

### 2. Backend API Tests

#### Test 2.1: Create Key via API
```bash
# Get JWT token (login via frontend and copy from DevTools)
JWT_TOKEN="your_jwt_token_here"
API_URL="your_api_gateway_url"

curl -X POST "$API_URL/mcp/keys" \
  -H "Authorization: $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Key",
    "expires_days": 365
  }'
```

**Expected Response**:
```json
{
  "api_key": "thanos_mcp_...",
  "name": "API Test Key",
  "created_at": 1234567890,
  "expires_at": 1234567890,
  "message": "API key created successfully..."
}
```

- [ ] **Verify**: Status code 201
- [ ] **Verify**: Response contains full `api_key`
- [ ] **Verify**: `expires_at` is ~1 year from now

#### Test 2.2: List Keys via API
```bash
curl -X GET "$API_URL/mcp/keys" \
  -H "Authorization: $JWT_TOKEN"
```

**Expected Response**:
```json
{
  "keys": [
    {
      "api_key": "***abc12345",
      "api_key_full": "thanos_mcp_full_key...",
      "key_suffix": "abc12345",
      "key_id": "abc12345",
      "name": "Test Key",
      "created_at": 1234567890,
      "expires_at": 1234567890,
      "last_used": null,
      "status": "active"
    }
  ],
  "count": 1
}
```

- [ ] **Verify**: Status code 200
- [ ] **Verify**: Contains `api_key_full` field
- [ ] **Verify**: Contains `key_suffix` field
- [ ] **Verify**: Keys sorted by `created_at` (newest first)

#### Test 2.3: Revoke Key via API
```bash
# Use key suffix from list response
KEY_SUFFIX="abc12345"

curl -X DELETE "$API_URL/mcp/keys/$KEY_SUFFIX" \
  -H "Authorization: $JWT_TOKEN"
```

**Expected Response**:
```json
{
  "message": "API key revoked successfully"
}
```

- [ ] **Verify**: Status code 200
- [ ] **Verify**: Key no longer in list
- [ ] **Verify**: Key no longer works for MCP auth

---

### 3. MCP Server Tests

#### Test 3.1: Get Lambda URL
```bash
cd infra
terraform output mcp_server_url
```

- [ ] **Verify**: URL format: `https://[id].lambda-url.[region].on.aws/`
- [ ] Copy URL for next tests

#### Test 3.2: Test Initialize Endpoint
```bash
MCP_URL="your_lambda_url_here"
API_KEY="thanos_mcp_your_key_here"

curl -X POST "$MCP_URL/initialize" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response**:
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

- [ ] **Verify**: Status code 200
- [ ] **Verify**: Contains `protocolVersion`
- [ ] **Verify**: Contains `capabilities`
- [ ] **Verify**: Contains `serverInfo`

#### Test 3.3: Test Tools List
```bash
curl -X POST "$MCP_URL/messages" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

**Expected Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "get_findings",
        "description": "Get security and compliance findings...",
        "inputSchema": {...}
      },
      ...
    ]
  },
  "id": 1
}
```

- [ ] **Verify**: Status code 200
- [ ] **Verify**: Contains multiple tools
- [ ] **Verify**: Each tool has `name`, `description`, `inputSchema`

#### Test 3.4: Test Invalid API Key
```bash
curl -X POST "$MCP_URL/initialize" \
  -H "x-api-key: invalid_key" \
  -H "Content-Type: application/json"
```

**Expected Response**:
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

- [ ] **Verify**: Status code 401
- [ ] **Verify**: Error message about invalid key

#### Test 3.5: Test Missing API Key
```bash
curl -X POST "$MCP_URL/initialize" \
  -H "Content-Type: application/json"
```

**Expected Response**:
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

- [ ] **Verify**: Status code 401
- [ ] **Verify**: Error message about missing header

---

### 4. Claude Desktop Integration Tests

#### Test 4.1: Configure Claude Desktop
- [ ] Get MCP server URL from Terraform output
- [ ] Create API key in frontend
- [ ] Copy full key immediately
- [ ] Open Claude Desktop config file:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
  - Linux: `~/.config/Claude/claude_desktop_config.json`
- [ ] Add configuration:
  ```json
  {
    "mcpServers": {
      "thanos": {
        "url": "https://your-lambda-url...",
        "headers": {
          "x-api-key": "thanos_mcp_your_full_key"
        }
      }
    }
  }
  ```
- [ ] Save file
- [ ] Restart Claude Desktop

#### Test 4.2: Verify MCP Connection
- [ ] Open Claude Desktop
- [ ] Look for MCP indicator (usually in settings or status bar)
- [ ] **Verify**: "thanos" server shows as connected
- [ ] **Verify**: No error messages

#### Test 4.3: Test Basic Queries
- [ ] Ask Claude: "List all customers"
- [ ] **Verify**: Claude uses `list_customers` tool
- [ ] **Verify**: Returns list of customers
- [ ] **Verify**: No authentication errors

- [ ] Ask Claude: "Show me dashboard metrics for demo-customer"
- [ ] **Verify**: Claude uses `get_dashboard_metrics` tool
- [ ] **Verify**: Returns metrics data
- [ ] **Verify**: Formatted nicely

- [ ] Ask Claude: "What are the critical findings for prod-customer?"
- [ ] **Verify**: Claude uses `get_findings` tool with severity filter
- [ ] **Verify**: Returns findings
- [ ] **Verify**: Filters by CRITICAL severity

#### Test 4.4: Test Complex Queries
- [ ] Ask Claude: "Show me all S3 buckets for demo-customer that are non-compliant"
- [ ] **Verify**: Claude uses `list_resources` tool
- [ ] **Verify**: Filters by resource_type and compliance_status
- [ ] **Verify**: Returns relevant results

- [ ] Ask Claude: "Compare the compliance status between demo-customer and prod-customer"
- [ ] **Verify**: Claude makes multiple tool calls
- [ ] **Verify**: Provides comparison analysis

---

### 5. Error Handling Tests

#### Test 5.1: Expired Key
- [ ] Create key with short expiration (modify code temporarily)
- [ ] Wait for expiration
- [ ] Try to use key
- [ ] **Verify**: Returns "API key expired" error

#### Test 5.2: Revoked Key
- [ ] Create key
- [ ] Use key successfully
- [ ] Revoke key
- [ ] Try to use key again
- [ ] **Verify**: Returns "Invalid or inactive API key" error

#### Test 5.3: Network Errors
- [ ] Temporarily disable Lambda
- [ ] Try to use MCP in Claude
- [ ] **Verify**: Graceful error handling
- [ ] **Verify**: Claude shows connection error

#### Test 5.4: Invalid Tenant ID
- [ ] Ask Claude: "Show metrics for invalid-tenant-id"
- [ ] **Verify**: Returns appropriate error
- [ ] **Verify**: Doesn't crash

---

### 6. Performance Tests

#### Test 6.1: Key Lookup Performance
```bash
# Time 10 requests
for i in {1..10}; do
  time curl -X POST "$MCP_URL/initialize" \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -s -o /dev/null
done
```

- [ ] **Verify**: Average response time < 500ms
- [ ] **Verify**: No timeouts

#### Test 6.2: Concurrent Requests
```bash
# 10 concurrent requests
for i in {1..10}; do
  curl -X POST "$MCP_URL/initialize" \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json" &
done
wait
```

- [ ] **Verify**: All requests succeed
- [ ] **Verify**: No rate limiting errors

---

### 7. Security Tests

#### Test 7.1: CORS Headers
```bash
curl -X OPTIONS "$MCP_URL/initialize" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: x-api-key" \
  -v
```

- [ ] **Verify**: CORS headers present
- [ ] **Verify**: Allows required headers

#### Test 7.2: SQL Injection Attempt
```bash
curl -X POST "$MCP_URL/messages" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_findings",
      "arguments": {
        "tenant_id": "demo'; DROP TABLE users; --"
      }
    },
    "id": 1
  }'
```

- [ ] **Verify**: Request handled safely
- [ ] **Verify**: No database errors
- [ ] **Verify**: Returns appropriate error or empty result

#### Test 7.3: XSS Attempt
```bash
curl -X POST "$MCP_URL/messages" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_findings",
      "arguments": {
        "tenant_id": "<script>alert(1)</script>"
      }
    },
    "id": 1
  }'
```

- [ ] **Verify**: Script tags not executed
- [ ] **Verify**: Response properly escaped

---

## Regression Tests

### Test Previous Functionality

- [ ] **Customer Management**
  - [ ] List customers
  - [ ] Register new customer
  - [ ] View customer details

- [ ] **Scan Functionality**
  - [ ] Trigger scan
  - [ ] View scan results
  - [ ] Check compliance metrics

- [ ] **Findings**
  - [ ] List findings
  - [ ] Filter by severity
  - [ ] View finding details

- [ ] **Resources**
  - [ ] List resources
  - [ ] Filter by type
  - [ ] View resource details

- [ ] **Rules Management**
  - [ ] List rules
  - [ ] Create custom rule
  - [ ] Edit rule
  - [ ] Delete rule

---

## Sign-Off Checklist

### Development
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Code reviewed
- [ ] Documentation updated

### Deployment
- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] Database migrations applied
- [ ] Environment variables set

### Testing
- [ ] All manual tests completed
- [ ] All automated tests pass
- [ ] Performance acceptable
- [ ] Security tests pass

### Documentation
- [ ] User guide updated
- [ ] API documentation updated
- [ ] Troubleshooting guide updated
- [ ] Architecture diagrams updated

### Monitoring
- [ ] CloudWatch logs configured
- [ ] Alarms set up
- [ ] Metrics dashboard created
- [ ] Error tracking enabled

---

## Test Results Template

```
Test Date: _______________
Tester: _______________
Environment: _______________

Pre-Deployment Tests:
- Backend: ☐ Pass ☐ Fail
- Frontend: ☐ Pass ☐ Fail

Post-Deployment Tests:
- API Key Management: ☐ Pass ☐ Fail
- Backend API: ☐ Pass ☐ Fail
- MCP Server: ☐ Pass ☐ Fail
- Claude Integration: ☐ Pass ☐ Fail
- Error Handling: ☐ Pass ☐ Fail
- Performance: ☐ Pass ☐ Fail
- Security: ☐ Pass ☐ Fail

Regression Tests:
- Previous Functionality: ☐ Pass ☐ Fail

Issues Found:
1. _______________
2. _______________
3. _______________

Sign-Off:
Developer: _______________ Date: _______________
QA: _______________ Date: _______________
Product Owner: _______________ Date: _______________
```
