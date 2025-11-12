#!/bin/bash
# Pause Cloud Golden Guard (minimal cost mode)
# Keeps infrastructure but prevents usage

set -e

echo "=========================================="
echo "Cloud Golden Guard - Pause Mode"
echo "=========================================="
echo ""
echo "This will:"
echo "  ✓ Keep all infrastructure (no data loss)"
echo "  ✓ Disable API Gateway (prevent new scans)"
echo "  ✓ Keep Lambda functions (minimal cost when idle)"
echo "  ✓ Keep DynamoDB and S3 (storage costs only)"
echo ""
echo "Estimated cost while paused: ~\$1-2/month (storage only)"
echo ""

read -p "Continue? (yes/no): " confirmation
if [ "$confirmation" != "yes" ]; then
    exit 0
fi

cd "$(dirname "$0")/../infra"

# Get API ID
API_ID=$(terraform output -raw api_url 2>/dev/null | sed 's|https://||' | cut -d'.' -f1 || echo "")

if [ -z "$API_ID" ]; then
    echo "Error: Could not find API Gateway ID"
    exit 1
fi

REGION=$(terraform output -raw aws_region 2>/dev/null || echo "us-east-1")

echo ""
echo "Disabling API Gateway..."

# Delete the default stage (effectively disables the API)
aws apigatewayv2 delete-stage \
    --api-id $API_ID \
    --stage-name '$default' \
    --region $REGION 2>/dev/null || echo "Stage already deleted"

echo ""
echo "✓ API Gateway disabled"
echo ""
echo "=========================================="
echo "Resources are now in PAUSE mode"
echo "=========================================="
echo ""
echo "Your data is safe, but the API is inaccessible."
echo "Storage costs will continue (~\$1-2/month)."
echo ""
echo "To resume:"
echo "  1. Redeploy: cd infra && terraform apply"
echo ""
echo "To completely stop billing:"
echo "  bash scripts/cleanup-all.sh"
echo ""
