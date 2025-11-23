# MCP Real API Integration - Deployment Guide

## What Was Implemented

✅ **Real Thanos API integration** - MCP server now calls actual Thanos API instead of returning placeholders

### Changes Made

**File**: `lambdas/mcp_server/server_hosted.py`

#### 1. Added HTTP Client
```python
import urllib3
from urllib.parse import urlencode

# HTTP client for API calls
http = urllib3.PoolManager()
```

#### 2. Added API Call Helper
```python
def call_thanos_api(endpoint: str, method: str = 'GET', params: Optional[Dict] = None, body: Optional[Dict] = None, user_email: Optional[str] = None) -> Dict[str, Any]:
    """Call the Thanos API with proper authentication."""
    # Builds URL, makes HTTP request, handles errors
```

#### 3. Implemented Real Tool Handlers
- ✅ `execute_get_findings()` - Calls `/findings` endpoint
- ✅ `execute_get_resources()` - Calls `/resources` endpoint  
- ✅ `execute_get_metrics()` - Calls `/findings/metrics` endpoint

#### 4. Updated Tool Call Handler
```python
def handle_tool_call_jsonrpc(params: Dict[str, Any], key_data: Dict[str, Any], msg_id: Any) -> Dict[str, Any]:
    # Routes to real tool implementations
    if tool_name == 'get_findings':
        result = execute_get_findings(arguments)
    elif tool_name == 'get_resources':
        result = execute_get_resources(arguments)
    elif tool_name == 'get_metrics':
        result = execute_get_metrics(arguments)
```

## Deployment Steps

### 1. Package Lambda
```bash
make package
```

### 2. Deploy Infrastructure
```bash
cd infra
terraform apply
```

### 3. Verify Environment Variables
The Lambda needs `THANOS_API_URL` environment variable set. Check it's configured:

```bash
cd infra
terraform output api_endpoint
```

Should return something like: `https://s9vvtq1ys6.execute-api.us-west-1.amazonaws.com`

### 4. Test the Integration

#### Test 1: Get Findings
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
        "severity": "CRITICAL",
        "limit": 10
      }
    },
    "id": 1
  }'
```

**Expected**: Real findings data from your Thanos database

#### Test 2: Get Resources
```bash
curl -X POST "https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: thanos_mcp_YOUR_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_resources",
      "arguments": {
        "tenant_id": "demo-customer",
        "limit": 50
      }
    },
    "id": 2
  }'
```

**Expected**: Real resources data from your Thanos database

#### Test 3: Get Metrics
```bash
curl -X POST "https://cs6aum6qkbteaf7fvjyziz5f2m0toyua.lambda-url.us-west-1.on.aws/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: thanos_mcp_YOUR_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_metrics",
      "arguments": {
        "tenant_id": "demo-customer"
      }
    },
    "id": 3
  }'
```

**Expected**: Real dashboard metrics from your Thanos database

## Using with Kiro IDE

After deployment, ask Kiro:

```
"Get my security and compliance findings from my cloud"
```

**Expected Response**: Real findings data instead of placeholder!

Example queries:
- "Show me all critical findings for demo-customer"
- "What are the compliance metrics for prod-customer?"
- "List all S3 buckets for demo-customer"
- "Show me resources with compliance issues"

## Available Tools

### 1. get_findings
**Description**: Get security and compliance findings

**Parameters**:
- `tenant_id` (required): Customer identifier
- `severity` (optional): CRITICAL, HIGH, MEDIUM, LOW
- `resource_type` (optional): Filter by AWS resource type
- `limit` (optional): Max results (default: 50)

**Example**:
```json
{
  "name": "get_findings",
  "arguments": {
    "tenant_id": "demo-customer",
    "severity": "CRITICAL",
    "limit": 10
  }
}
```

### 2. get_resources
**Description**: Get cloud resources and compliance status

**Parameters**:
- `tenant_id` (required): Customer identifier
- `resource_type` (optional): Filter by AWS resource type
- `region` (optional): Filter by AWS region
- `limit` (optional): Max results (default: 100)

**Example**:
```json
{
  "name": "get_resources",
  "arguments": {
    "tenant_id": "demo-customer",
    "resource_type": "AWS::S3::Bucket"
  }
}
```

### 3. get_metrics
**Description**: Get compliance metrics and statistics

**Parameters**:
- `tenant_id` (required): Customer identifier

**Example**:
```json
{
  "name": "get_metrics",
  "arguments": {
    "tenant_id": "demo-customer"
  }
}
```

## Troubleshooting

### Issue: "Error fetching findings: API error: 404"

**Cause**: Tenant ID doesn't exist or no data available

**Solution**:
1. Check tenant ID is correct
2. Run a scan first to populate data
3. Verify data exists in DynamoDB

### Issue: "Error calling Thanos API: Connection refused"

**Cause**: THANOS_API_URL not configured or incorrect

**Solution**:
1. Check Lambda environment variable:
   ```bash
   aws lambda get-function-configuration \
     --function-name thanos-mcp-server \
     --region us-west-1 \
     --query 'Environment.Variables.THANOS_API_URL'
   ```
2. Should return: `https://s9vvtq1ys6.execute-api.us-west-1.amazonaws.com`
3. If wrong, update in `infra/lambda_mcp_server.tf` and redeploy

### Issue: Still getting placeholder responses

**Cause**: Old Lambda code still deployed

**Solution**:
1. Verify package was created: `ls -lh dist/mcp_server.zip`
2. Redeploy: `cd infra && terraform apply`
3. Check Lambda was updated:
   ```bash
   aws lambda get-function \
     --function-name thanos-mcp-server \
     --region us-west-1 \
     --query 'Configuration.LastModified'
   ```

### Issue: "Error: tenant_id is required"

**Cause**: Missing required parameter

**Solution**: Include `tenant_id` in tool arguments:
```json
{
  "name": "get_findings",
  "arguments": {
    "tenant_id": "demo-customer"  // ← Required!
  }
}
```

## CloudWatch Logs

Monitor Lambda execution:

```bash
aws logs tail /aws/lambda/thanos-mcp-server --follow --region us-west-1
```

Look for:
- `Calling tool: get_findings with args: {...}`
- `Calling Thanos API: GET https://...`
- `Error calling Thanos API: ...` (if issues)

## Verification Checklist

- [ ] Lambda packaged (`make package`)
- [ ] Infrastructure deployed (`terraform apply`)
- [ ] THANOS_API_URL environment variable set
- [ ] Test 1: get_findings returns real data
- [ ] Test 2: get_resources returns real data
- [ ] Test 3: get_metrics returns real data
- [ ] Kiro IDE query returns real data
- [ ] CloudWatch logs show API calls
- [ ] No placeholder responses

## Summary

**Before**:
```
Tool get_findings executed successfully. This is a placeholder response. 
Integration with Thanos API pending.
```

**After**:
```
# Security Findings for demo-customer

**Total Findings:** 15

## CRITICAL (3)
- **S3 bucket allows public access**
  - Resource: `arn:aws:s3:::my-bucket`
  - Type: AWS::S3::Bucket

## HIGH (7)
- **IAM policy allows wildcard actions**
  - Resource: `arn:aws:iam::123456789012:policy/my-policy`
  - Type: AWS::IAM::Policy
...
```

**The MCP server now returns real data from your Thanos infrastructure!** 🎉
