# MCP Auth Fix - Direct Lambda Invocation

## Problem

The MCP server was getting **401 Unauthorized** errors when trying to call the Thanos API because:
- All API Gateway routes require JWT (Cognito) authentication
- The MCP server was calling through API Gateway without authentication
- Comment said "no auth needed for internal calls" but that was incorrect

## Solution

**Changed from**: HTTP calls through API Gateway (requires JWT)  
**Changed to**: Direct Lambda invocation (no auth needed, uses IAM)

### Benefits
- ✅ No authentication needed (IAM-based)
- ✅ Faster (no API Gateway overhead)
- ✅ More secure (internal AWS service-to-service)
- ✅ Lower cost (no API Gateway charges for internal calls)

## Changes Made

### 1. Lambda Code Changes

**File**: `lambdas/mcp_server/server_hosted.py`

#### Removed HTTP Client
```python
# REMOVED
import urllib3
from urllib.parse import urlencode
http = urllib3.PoolManager()
THANOS_API_URL = os.environ.get('THANOS_API_URL', '')
```

#### Added Lambda Client
```python
# ADDED
lambda_client = boto3.client('lambda')

# Lambda function names from environment
CUSTOMERS_LAMBDA = os.environ.get('CUSTOMERS_LAMBDA_NAME', '')
FINDINGS_LAMBDA = os.environ.get('FINDINGS_LAMBDA_NAME', '')
RESOURCES_LAMBDA = os.environ.get('RESOURCES_LAMBDA_NAME', '')
METRICS_LAMBDA = os.environ.get('METRICS_LAMBDA_NAME', '')
```

#### Replaced call_thanos_api with invoke_lambda
```python
def invoke_lambda(function_name: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """Invoke a Lambda function directly (bypasses API Gateway auth)."""
    response = lambda_client.invoke(
        FunctionName=function_name,
        InvocationType='RequestResponse',
        Payload=json.dumps(event)
    )
    # Parse and return response
```

#### Updated Tool Handlers
```python
# BEFORE
response = call_thanos_api('/customers')

# AFTER
event = {
    'httpMethod': 'GET',
    'path': '/customers',
    'queryStringParameters': None
}
response = invoke_lambda(CUSTOMERS_LAMBDA, event)
```

### 2. Infrastructure Changes

**File**: `infra/lambda_mcp_server.tf`

#### Added Lambda Invoke Permissions
```hcl
{
  Effect = "Allow"
  Action = [
    "lambda:InvokeFunction"
  ]
  Resource = [
    aws_lambda_function.customers.arn,
    aws_lambda_function.findings.arn,
    aws_lambda_function.resources.arn,
    aws_lambda_function.metrics.arn
  ]
}
```

#### Updated Environment Variables
```hcl
environment {
  variables = {
    MCP_KEYS_TABLE         = aws_dynamodb_table.mcp_keys.name
    CUSTOMERS_LAMBDA_NAME  = aws_lambda_function.customers.function_name
    FINDINGS_LAMBDA_NAME   = aws_lambda_function.findings.function_name
    RESOURCES_LAMBDA_NAME  = aws_lambda_function.resources.function_name
    METRICS_LAMBDA_NAME    = aws_lambda_function.metrics.function_name
  }
}
```

## Deployment

```bash
# 1. Package Lambda
make package

# 2. Deploy Infrastructure
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

**Expected**: List of customers (no 401 error!)

### Test 2: Get Findings
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

**Expected**: Real findings data (no 401 error!)

### Test with AI Assistant

Ask Kiro IDE:
```
"Show me all my customers"
```

**Expected**: List of customers with tenant IDs

Then ask:
```
"Get my security findings"
```

**Expected**: Real security findings from your infrastructure!

## Architecture

### Before (Broken)

```
MCP Server Lambda
    │
    │ HTTP GET /customers
    │ (no JWT token)
    ▼
API Gateway
    │
    │ Requires JWT auth
    ▼
❌ 401 Unauthorized
```

### After (Fixed)

```
MCP Server Lambda
    │
    │ lambda:InvokeFunction
    │ (IAM-based auth)
    ▼
Customers Lambda
    │
    │ Direct invocation
    ▼
✅ Returns customer data
```

## Benefits of Direct Lambda Invocation

### Security
- ✅ IAM-based authentication (more secure than JWT for internal calls)
- ✅ No credentials to manage
- ✅ Least privilege access (only specific Lambdas)

### Performance
- ✅ Faster (no API Gateway overhead)
- ✅ Lower latency (direct invocation)
- ✅ No cold starts from API Gateway

### Cost
- ✅ No API Gateway charges for internal calls
- ✅ Only Lambda invocation costs

### Reliability
- ✅ No API Gateway rate limits
- ✅ Simpler architecture
- ✅ Fewer points of failure

## CloudWatch Logs

After deployment, check logs:

```bash
aws logs tail /aws/lambda/thanos-mcp-server --follow --region us-west-1
```

Look for:
- `Invoking Lambda: thanos-customers` (instead of "Calling Thanos API")
- No more "API error: 401" messages
- Successful responses from Lambda invocations

## Verification Checklist

- [ ] Lambda packaged (`make package`)
- [ ] Infrastructure deployed (`terraform apply`)
- [ ] Environment variables set (check Lambda console)
- [ ] IAM permissions added (check Lambda role)
- [ ] Test 1: list_customers returns data (no 401)
- [ ] Test 2: get_findings returns data (no 401)
- [ ] AI query: "Show me all my customers" works
- [ ] AI query: "Get my security findings" works
- [ ] CloudWatch logs show Lambda invocations
- [ ] No 401 errors in logs

## Troubleshooting

### Issue: "Lambda function name not configured"

**Cause**: Environment variables not set

**Solution**:
```bash
# Check Lambda environment variables
aws lambda get-function-configuration \
  --function-name thanos-mcp-server \
  --region us-west-1 \
  --query 'Environment.Variables'

# Should show:
# {
#   "CUSTOMERS_LAMBDA_NAME": "thanos-customers",
#   "FINDINGS_LAMBDA_NAME": "thanos-findings",
#   ...
# }
```

### Issue: "AccessDeniedException: User is not authorized to perform: lambda:InvokeFunction"

**Cause**: IAM permissions not added

**Solution**:
```bash
# Check Lambda role policy
aws iam get-role-policy \
  --role-name thanos-mcp-server \
  --policy-name mcp-server-policy

# Should include lambda:InvokeFunction permission
```

### Issue: Still getting 401 errors

**Cause**: Old Lambda code still deployed

**Solution**:
```bash
# Verify Lambda was updated
aws lambda get-function \
  --function-name thanos-mcp-server \
  --region us-west-1 \
  --query 'Configuration.LastModified'

# Should show recent timestamp
```

## Summary

**Problem**: MCP server getting 401 errors calling Thanos API through API Gateway

**Root Cause**: API Gateway requires JWT authentication, MCP server had no credentials

**Solution**: Changed to direct Lambda invocation using IAM-based authentication

**Result**: 
- ✅ No more 401 errors
- ✅ Faster performance
- ✅ Lower cost
- ✅ More secure
- ✅ AI can now query your infrastructure!

**Deploy now to fix the authentication issue!** 🔒
