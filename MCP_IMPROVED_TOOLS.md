# MCP Tools Improved - Better Descriptions & list_customers

## What Was Added

✅ **New Tool**: `list_customers` - Lists all registered customers/tenants  
✅ **Better Descriptions**: All tools now have clear, helpful descriptions  
✅ **Better Error Messages**: Tools guide users to call `list_customers` first  
✅ **Required Fields**: All tools clearly mark `tenant_id` as required

## Changes Made

### 1. Added list_customers Tool

**Purpose**: Get available tenant IDs before calling other tools

**Description**: 
> "List all registered customers/tenants. ALWAYS call this first to get available tenant_id values before calling other tools that require tenant_id."

**Parameters**: None (no parameters needed)

**Returns**: List of customers with their tenant IDs, AWS accounts, and regions

**Example Response**:
```markdown
# Registered Customers

**Total Customers:** 2

## Demo Customer
- **Tenant ID:** `demo-customer` ← Use this ID for other tools
- **AWS Account:** 123456789012
- **Regions:** us-east-1, us-west-2
- **Status:** active

## Production Customer
- **Tenant ID:** `prod-customer` ← Use this ID for other tools
- **AWS Account:** 987654321098
- **Regions:** us-east-1
- **Status:** active

---
**Next Steps:**
- Use the `tenant_id` values above with other tools
- Example: `get_findings` with tenant_id="demo-customer"
- Example: `get_metrics` with tenant_id="prod-customer"
```

### 2. Improved Tool Descriptions

#### get_findings
**Before**: "Get security and compliance findings for cloud resources"

**After**: "Get security and compliance findings for a specific customer. Returns violations, misconfigurations, and security issues found in their cloud infrastructure. Call list_customers first to get valid tenant_id values."

#### get_resources
**Before**: "Get cloud resources and their compliance status"

**After**: "Get cloud resources and their compliance status for a specific customer. Shows all AWS resources being monitored with their compliance state. Call list_customers first to get valid tenant_id values."

#### get_metrics
**Before**: "Get compliance metrics and statistics"

**After**: "Get compliance metrics and dashboard statistics for a specific customer. Shows overall compliance rate, findings by severity, and trends. Call list_customers first to get valid tenant_id values."

### 3. Better Error Messages

**Before**:
```
Error: tenant_id is required
```

**After**:
```
Error: tenant_id is required. Call list_customers first to get available tenant IDs, then use one of those IDs with this tool.
```

### 4. Marked Required Fields

All tools now clearly mark `tenant_id` as required in their schema:

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "tenant_id": {
        "type": "string",
        "description": "Customer/tenant identifier (required). Get this from list_customers tool first."
      }
    },
    "required": ["tenant_id"]
  }
}
```

## Deployment

```bash
# 1. Package Lambda
make package

# 2. Deploy
cd infra
terraform apply
```

## Testing

### Test 1: List Customers
```bash
curl -X POST "https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: thanos_mcp_YOUR_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_customers",
      "arguments": {}
    },
    "id": 1
  }'
```

**Expected**: List of all registered customers with their tenant IDs

### Test 2: Get Findings (with tenant_id)
```bash
curl -X POST "https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: thanos_mcp_YOUR_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_findings",
      "arguments": {
        "tenant_id": "demo-customer",
        "severity": "CRITICAL"
      }
    },
    "id": 2
  }'
```

**Expected**: Real findings data for demo-customer

### Test 3: Get Findings (without tenant_id)
```bash
curl -X POST "https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: thanos_mcp_YOUR_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_findings",
      "arguments": {}
    },
    "id": 3
  }'
```

**Expected**: Helpful error message telling user to call list_customers first

## Using with AI Assistants

### Natural Language Queries

The AI will now automatically:
1. Call `list_customers` first to get available tenant IDs
2. Use those tenant IDs for subsequent queries

**Example Conversation**:

**User**: "Get my security findings"

**AI**: 
1. Calls `list_customers` → Gets: `demo-customer`, `prod-customer`
2. Calls `get_findings` with `tenant_id="demo-customer"`
3. Returns findings

**User**: "Show me compliance metrics for production"

**AI**:
1. Calls `list_customers` → Gets: `demo-customer`, `prod-customer`
2. Matches "production" to `prod-customer`
3. Calls `get_metrics` with `tenant_id="prod-customer"`
4. Returns metrics

### Example Queries That Now Work

- ✅ "Show me all my customers"
- ✅ "Get security findings for my infrastructure"
- ✅ "What's the compliance status of my cloud?"
- ✅ "List all critical findings"
- ✅ "Show me resources in production"
- ✅ "What are the metrics for demo environment?"

## Tool Workflow

### Recommended Flow

```
1. list_customers
   ↓
   Returns: demo-customer, prod-customer
   ↓
2. get_findings (tenant_id="demo-customer")
   ↓
   Returns: Security findings
   ↓
3. get_resources (tenant_id="demo-customer")
   ↓
   Returns: Cloud resources
   ↓
4. get_metrics (tenant_id="demo-customer")
   ↓
   Returns: Compliance metrics
```

### AI Behavior

The AI assistant will now:
1. **Automatically call list_customers** when user asks about "my" infrastructure
2. **Use tenant IDs** from the list for subsequent queries
3. **Match natural language** to tenant IDs (e.g., "production" → "prod-customer")
4. **Provide helpful errors** if tenant_id is missing

## Available Tools Summary

| Tool | Purpose | Required Params | Optional Params |
|------|---------|----------------|-----------------|
| `list_customers` | Get all tenant IDs | None | None |
| `get_findings` | Get security findings | `tenant_id` | `severity`, `resource_type`, `limit` |
| `get_resources` | Get cloud resources | `tenant_id` | `resource_type`, `region`, `limit` |
| `get_metrics` | Get compliance metrics | `tenant_id` | None |

## Benefits

### Before
- ❌ User had to know tenant IDs
- ❌ Cryptic error messages
- ❌ No way to discover available tenants
- ❌ AI couldn't figure out what to do

### After
- ✅ AI automatically discovers tenant IDs
- ✅ Clear, helpful error messages
- ✅ `list_customers` tool for discovery
- ✅ AI knows to call it first
- ✅ Natural language queries work

## Verification Checklist

- [ ] Lambda packaged (`make package`)
- [ ] Infrastructure deployed (`terraform apply`)
- [ ] Test 1: list_customers returns data
- [ ] Test 2: get_findings with tenant_id works
- [ ] Test 3: get_findings without tenant_id shows helpful error
- [ ] AI query: "Show me all my customers" works
- [ ] AI query: "Get my security findings" works
- [ ] AI query: "What's my compliance status?" works

## Summary

**Added**:
- ✅ `list_customers` tool to discover tenant IDs
- ✅ Better tool descriptions with clear instructions
- ✅ Helpful error messages guiding users
- ✅ Required field markers in schemas

**Result**: AI assistants can now automatically discover tenant IDs and use them correctly without user intervention!

**Deploy now to enable smart, automatic tenant discovery!** 🎯
