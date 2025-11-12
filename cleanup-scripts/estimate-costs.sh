#!/bin/bash
# Estimate current AWS costs for Cloud Golden Guard resources

set -e

echo "=========================================="
echo "Cloud Golden Guard - Cost Estimator"
echo "=========================================="
echo ""

cd "$(dirname "$0")/../infra"

# Check if resources exist
if [ ! -f "terraform.tfstate" ]; then
    echo "No Terraform state found. No resources deployed."
    exit 0
fi

echo "Analyzing deployed resources..."
echo ""

# Get resource information
REGION=$(terraform output -raw aws_region 2>/dev/null || echo "us-east-1")
FINDINGS_TABLE=$(terraform output -raw findings_table 2>/dev/null || echo "")
SNAPSHOTS_BUCKET=$(terraform output -raw snapshots_bucket 2>/dev/null || echo "")

# Lambda functions
echo "📊 Lambda Functions:"
SCAN_LAMBDA=$(aws lambda list-functions --region $REGION --query "Functions[?contains(FunctionName, 'scan-handler')].FunctionName" --output text 2>/dev/null || echo "")
FINDINGS_LAMBDA=$(aws lambda list-functions --region $REGION --query "Functions[?contains(FunctionName, 'findings-handler')].FunctionName" --output text 2>/dev/null || echo "")

if [ -n "$SCAN_LAMBDA" ]; then
    SCAN_INVOCATIONS=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Invocations \
        --dimensions Name=FunctionName,Value=$SCAN_LAMBDA \
        --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 2592000 \
        --statistics Sum \
        --region $REGION \
        --query 'Datapoints[0].Sum' --output text 2>/dev/null || echo "0")
    
    echo "  Scan Handler: $SCAN_INVOCATIONS invocations (last 30 days)"
    echo "    Est. cost: \$$(echo "scale=2; $SCAN_INVOCATIONS * 0.0000002 * 512 * 300" | bc) (assuming 5min runtime)"
fi

if [ -n "$FINDINGS_LAMBDA" ]; then
    FINDINGS_INVOCATIONS=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Invocations \
        --dimensions Name=FunctionName,Value=$FINDINGS_LAMBDA \
        --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 2592000 \
        --statistics Sum \
        --region $REGION \
        --query 'Datapoints[0].Sum' --output text 2>/dev/null || echo "0")
    
    echo "  Findings Handler: $FINDINGS_INVOCATIONS invocations (last 30 days)"
    echo "    Est. cost: \$$(echo "scale=2; $FINDINGS_INVOCATIONS * 0.0000002 * 256 * 30" | bc)"
fi

echo ""

# DynamoDB
echo "📊 DynamoDB:"
if [ -n "$FINDINGS_TABLE" ]; then
    ITEM_COUNT=$(aws dynamodb describe-table --table-name $FINDINGS_TABLE --region $REGION --query 'Table.ItemCount' --output text 2>/dev/null || echo "0")
    TABLE_SIZE=$(aws dynamodb describe-table --table-name $FINDINGS_TABLE --region $REGION --query 'Table.TableSizeBytes' --output text 2>/dev/null || echo "0")
    TABLE_SIZE_MB=$(echo "scale=2; $TABLE_SIZE / 1024 / 1024" | bc)
    
    echo "  Table: $FINDINGS_TABLE"
    echo "    Items: $ITEM_COUNT"
    echo "    Size: ${TABLE_SIZE_MB} MB"
    echo "    Est. storage cost: \$$(echo "scale=4; $TABLE_SIZE_MB * 0.25 / 1024" | bc)/month"
    echo "    Note: Pay-per-request pricing for reads/writes"
fi

echo ""

# S3
echo "📊 S3 Buckets:"
if [ -n "$SNAPSHOTS_BUCKET" ]; then
    SNAPSHOT_SIZE=$(aws s3 ls s3://$SNAPSHOTS_BUCKET --recursive --summarize 2>/dev/null | grep "Total Size" | awk '{print $3}')
    if [ -n "$SNAPSHOT_SIZE" ]; then
        SNAPSHOT_SIZE_GB=$(echo "scale=2; $SNAPSHOT_SIZE / 1024 / 1024 / 1024" | bc)
        echo "  Snapshots: ${SNAPSHOT_SIZE_GB} GB"
        echo "    Est. storage cost: \$$(echo "scale=4; $SNAPSHOT_SIZE_GB * 0.023" | bc)/month"
    else
        echo "  Snapshots: Empty"
    fi
fi

echo ""

# API Gateway
echo "📊 API Gateway:"
API_ID=$(aws apigatewayv2 get-apis --region $REGION --query "Items[?contains(Name, 'cloud-golden-guard')].ApiId" --output text 2>/dev/null || echo "")
if [ -n "$API_ID" ]; then
    echo "  API ID: $API_ID"
    echo "  Note: HTTP API pricing is \$1.00 per million requests"
fi

echo ""
echo "=========================================="
echo "💡 Cost Optimization Tips:"
echo "=========================================="
echo ""
echo "1. Delete old snapshots: aws s3 rm s3://$SNAPSHOTS_BUCKET/tenants/{tenant}/snapshots/{old-date}/ --recursive"
echo "2. Delete old findings: Implement TTL on DynamoDB table"
echo "3. Reduce scan frequency: Only scan when needed"
echo "4. Use smaller regions list: Scan only necessary regions"
echo "5. Destroy when not in use: Run 'bash scripts/cleanup-all.sh'"
echo ""
echo "To completely stop billing, run:"
echo "  bash scripts/cleanup-all.sh"
echo ""
