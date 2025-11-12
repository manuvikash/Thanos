#!/bin/bash
# Verification script for Thanos deployment

set -e

echo "=========================================="
echo "Thanos - Deployment Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to infra directory
cd "$(dirname "$0")/../infra"

# Check if Terraform state exists
if [ ! -f "terraform.tfstate" ]; then
    echo -e "${RED}✗ Terraform state not found. Run 'make tf-apply' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Terraform state found${NC}"

# Get outputs
echo ""
echo "Fetching Terraform outputs..."
API_URL=$(terraform output -raw api_url 2>/dev/null || echo "")
API_KEY=$(terraform output -raw api_key 2>/dev/null || echo "")
WEB_BUCKET=$(terraform output -raw web_bucket 2>/dev/null || echo "")
WEB_URL=$(terraform output -raw web_url 2>/dev/null || echo "")

if [ -z "$API_URL" ] || [ -z "$API_KEY" ]; then
    echo -e "${RED}✗ Failed to get Terraform outputs${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API URL: $API_URL${NC}"
echo -e "${GREEN}✓ Web URL: $WEB_URL${NC}"
echo ""

# Test API Gateway health
echo "Testing API Gateway..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/findings?tenant_id=test" \
    -H "x-api-key: $API_KEY" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ API Gateway is accessible${NC}"
else
    echo -e "${YELLOW}⚠ API Gateway returned HTTP $HTTP_CODE (expected 200 for empty findings)${NC}"
fi

# Check Lambda functions
echo ""
echo "Checking Lambda functions..."
SCAN_LAMBDA=$(aws lambda list-functions --query "Functions[?contains(FunctionName, 'scan-handler')].FunctionName" --output text 2>/dev/null || echo "")
FINDINGS_LAMBDA=$(aws lambda list-functions --query "Functions[?contains(FunctionName, 'findings-handler')].FunctionName" --output text 2>/dev/null || echo "")

if [ -n "$SCAN_LAMBDA" ]; then
    echo -e "${GREEN}✓ Scan Lambda found: $SCAN_LAMBDA${NC}"
else
    echo -e "${RED}✗ Scan Lambda not found${NC}"
fi

if [ -n "$FINDINGS_LAMBDA" ]; then
    echo -e "${GREEN}✓ Findings Lambda found: $FINDINGS_LAMBDA${NC}"
else
    echo -e "${RED}✗ Findings Lambda not found${NC}"
fi

# Check DynamoDB table
echo ""
echo "Checking DynamoDB table..."
TABLE_NAME=$(aws dynamodb list-tables --query "TableNames[?contains(@, 'findings')]" --output text 2>/dev/null || echo "")

if [ -n "$TABLE_NAME" ]; then
    echo -e "${GREEN}✓ DynamoDB table found: $TABLE_NAME${NC}"
else
    echo -e "${RED}✗ DynamoDB table not found${NC}"
fi

# Check S3 buckets
echo ""
echo "Checking S3 buckets..."
SNAPSHOTS_BUCKET=$(aws s3 ls | grep "snapshots" | awk '{print $3}' | head -1 || echo "")
if [ -n "$SNAPSHOTS_BUCKET" ]; then
    echo -e "${GREEN}✓ Snapshots bucket found: $SNAPSHOTS_BUCKET${NC}"
else
    echo -e "${YELLOW}⚠ Snapshots bucket not found${NC}"
fi

if [ -n "$WEB_BUCKET" ]; then
    echo -e "${GREEN}✓ Web bucket found: $WEB_BUCKET${NC}"
else
    echo -e "${YELLOW}⚠ Web bucket not found${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Configure web UI: cd web && cp .env.example .env"
echo "2. Update .env with:"
echo "   VITE_API_URL=$API_URL"
echo "   VITE_API_KEY=<your-api-key>"
echo "3. Deploy customer role using cfn/customer-onboarding-role.yaml"
echo "4. Run a test scan using the API or web UI"
echo ""
