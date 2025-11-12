#!/bin/bash
# Test script for Thanos API

set -e

# Change to infra directory to get outputs
cd "$(dirname "$0")/../infra"

API_URL=$(terraform output -raw api_url 2>/dev/null || echo "")
API_KEY=$(terraform output -raw api_key 2>/dev/null || echo "")

if [ -z "$API_URL" ] || [ -z "$API_KEY" ]; then
    echo "Error: Could not get API URL or API Key from Terraform outputs"
    echo "Make sure you've run 'make tf-apply' first"
    exit 1
fi

echo "Testing Thanos API"
echo "API URL: $API_URL"
echo ""

# Test 1: Findings endpoint (should return empty or existing findings)
echo "Test 1: GET /findings?tenant_id=test-tenant"
echo "----------------------------------------"
curl -s "$API_URL/findings?tenant_id=test-tenant" \
    -H "x-api-key: $API_KEY" | jq '.' || echo "Failed"
echo ""
echo ""

# Test 2: Scan endpoint (requires valid role ARN)
echo "Test 2: POST /scan"
echo "----------------------------------------"
echo "Note: This will fail without a valid role ARN and account ID"
echo "Update the JSON below with your actual values to test scanning"
echo ""

# Example scan request (commented out - requires real credentials)
# curl -X POST "$API_URL/scan" \
#     -H "x-api-key: $API_KEY" \
#     -H "Content-Type: application/json" \
#     -d '{
#       "tenant_id": "test-tenant",
#       "role_arn": "arn:aws:iam::123456789012:role/CloudGoldenGuardAuditRole",
#       "account_id": "123456789012",
#       "regions": ["us-east-1"],
#       "rules_source": "repo"
#     }' | jq '.'

echo "To test scanning, run:"
echo ""
echo "curl -X POST \"$API_URL/scan\" \\"
echo "  -H \"x-api-key: $API_KEY\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"tenant_id\": \"test-tenant\","
echo "    \"role_arn\": \"arn:aws:iam::YOUR_ACCOUNT:role/CloudGoldenGuardAuditRole\","
echo "    \"account_id\": \"YOUR_ACCOUNT\","
echo "    \"regions\": [\"us-east-1\"],"
echo "    \"rules_source\": \"repo\""
echo "  }'"
echo ""
