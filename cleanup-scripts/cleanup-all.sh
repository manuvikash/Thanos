#!/bin/bash
# Complete cleanup script for Cloud Golden Guard
# This will destroy ALL resources created by Terraform

set -e

echo "=========================================="
echo "Cloud Golden Guard - Complete Cleanup"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will DESTROY all resources including:"
echo "  - Lambda functions"
echo "  - API Gateway"
echo "  - DynamoDB table (all findings will be lost)"
echo "  - S3 buckets (all snapshots will be deleted)"
echo "  - IAM roles and policies"
echo ""
echo "This action CANNOT be undone!"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to continue? Type 'yes' to confirm: " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Starting cleanup process..."
echo ""

# Change to infra directory
cd "$(dirname "$0")/../infra"

# Check if Terraform state exists
if [ ! -f "terraform.tfstate" ]; then
    echo "⚠️  No Terraform state found. Resources may not exist or were already destroyed."
    read -p "Continue anyway? (yes/no): " continue_anyway
    if [ "$continue_anyway" != "yes" ]; then
        exit 0
    fi
fi

# Get bucket names before destroying (needed for emptying)
echo "Step 1: Getting resource information..."
SNAPSHOTS_BUCKET=$(terraform output -raw snapshots_bucket 2>/dev/null || echo "")
RULES_BUCKET=$(terraform output -raw rules_bucket 2>/dev/null || echo "")
WEB_BUCKET=$(terraform output -raw web_bucket 2>/dev/null || echo "")

# Empty S3 buckets (Terraform can't destroy non-empty buckets)
echo ""
echo "Step 2: Emptying S3 buckets..."

if [ -n "$SNAPSHOTS_BUCKET" ]; then
    echo "  Emptying snapshots bucket: $SNAPSHOTS_BUCKET"
    aws s3 rm "s3://$SNAPSHOTS_BUCKET" --recursive 2>/dev/null || echo "    Bucket already empty or doesn't exist"
    # Delete all versions if versioning is enabled
    aws s3api delete-objects --bucket "$SNAPSHOTS_BUCKET" \
        --delete "$(aws s3api list-object-versions --bucket "$SNAPSHOTS_BUCKET" --query='{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --max-items 1000)" 2>/dev/null || true
fi

if [ -n "$RULES_BUCKET" ]; then
    echo "  Emptying rules bucket: $RULES_BUCKET"
    aws s3 rm "s3://$RULES_BUCKET" --recursive 2>/dev/null || echo "    Bucket already empty or doesn't exist"
    aws s3api delete-objects --bucket "$RULES_BUCKET" \
        --delete "$(aws s3api list-object-versions --bucket "$RULES_BUCKET" --query='{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --max-items 1000)" 2>/dev/null || true
fi

if [ -n "$WEB_BUCKET" ]; then
    echo "  Emptying web bucket: $WEB_BUCKET"
    aws s3 rm "s3://$WEB_BUCKET" --recursive 2>/dev/null || echo "    Bucket already empty or doesn't exist"
fi

echo "  ✓ S3 buckets emptied"

# Destroy Terraform resources
echo ""
echo "Step 3: Destroying Terraform resources..."
terraform destroy -auto-approve

echo ""
echo "Step 4: Cleaning up local build artifacts..."
cd ..
make clean 2>/dev/null || rm -rf dist/ web/dist/ web/node_modules/

echo ""
echo "=========================================="
echo "✓ Cleanup Complete!"
echo "=========================================="
echo ""
echo "All AWS resources have been destroyed."
echo "You will no longer be billed for Cloud Golden Guard."
echo ""
echo "Note: If you deployed the customer role using CloudFormation,"
echo "you should also delete that stack:"
echo ""
echo "  aws cloudformation delete-stack --stack-name CloudGoldenGuardAuditRole"
echo ""
