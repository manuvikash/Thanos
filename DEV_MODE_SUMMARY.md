# Development Mode Summary

## What's Currently Deployed (Minimal Dev Setup)

Your Terraform configuration is now optimized for **local development testing only**. Here's what will be created when you run `terraform apply`:

### Active Resources (Required for Dev)

✅ **API Gateway** - Backend API endpoints  
✅ **Lambda Functions** (5 total):
  - scan_handler - Runs AWS scans
  - findings_handler - Returns findings
  - registration_handler - Customer registration
  - customers_handler - Returns customer list
  - authorizer - API key authentication

✅ **DynamoDB Tables** (2 total):
  - findings - Stores scan findings
  - customers - Stores registered customers

✅ **S3 Bucket** (1 total):
  - snapshots - Stores scan snapshots

✅ **IAM Roles** - Lambda execution roles  
✅ **CloudWatch Log Groups** - Lambda logs

**Estimated monthly cost:** ~$5-10/month

### Commented Out (Production Only)

❌ **Admin Portal S3 Website** - You'll run locally with `npm run dev`  
❌ **Customer Portal S3 Website** - You'll run locally with `npm run dev`  
❌ **CloudFront Distribution** - CDN for Customer Portal (most expensive)  
❌ **Rules S3 Bucket** - You'll use local rules file

**Savings:** ~$2-10/month

## How to Test Locally

### 1. Deploy Infrastructure

```bash
cd infra
terraform init
terraform apply  # Will deploy to us-west-1
```

### 2. Get API Credentials

```bash
terraform output api_url
terraform output -raw api_key
```

### 3. Update .env Files

**web/.env:**
```
VITE_API_URL=<api-url-from-step-2>
VITE_API_KEY=<api-key-from-step-2>
```

**customer-portal/.env:**
```
VITE_API_URL=<api-url-from-step-2>
```

### 4. Start Local Development Servers

**Terminal 1 - Customer Portal:**
```bash
cd customer-portal
npm install
npm run dev
# Opens at http://localhost:5173/
```

**Terminal 2 - Admin Portal:**
```bash
cd web
npm install
npm run dev
# Opens at http://localhost:3000/
```

### 5. Deploy CloudFormation (Customer Role)

```bash
# Get your AWS account ID
export MY_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Deploy the audit role
aws cloudformation create-stack \
  --stack-name CloudGoldenGuardAuditRole \
  --template-body file://cfn/customer-onboarding-role.yaml \
  --parameters ParameterKey=TrustedAccountId,ParameterValue=$MY_ACCOUNT_ID \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-west-1

# Wait for completion
aws cloudformation wait stack-create-complete \
  --stack-name CloudGoldenGuardAuditRole \
  --region us-west-1

# Get the role ARN
aws cloudformation describe-stacks \
  --stack-name CloudGoldenGuardAuditRole \
  --query 'Stacks[0].Outputs[?OutputKey==`RoleArn`].OutputValue' \
  --output text \
  --region us-west-1
```

### 6. Register Customer

1. Go to http://localhost:5173/ (Customer Portal)
2. Fill in the form with the role ARN from step 5
3. Click "Register Customer"

### 7. Test Admin Portal

1. Go to http://localhost:3000/ (Admin Portal)
2. Select customer from dropdown
3. Run a scan
4. View findings

## When to Enable Production

Enable production infrastructure when you're ready to:

- Deploy portals to public URLs
- Share Customer Portal with actual customers
- Run the system 24/7 without your laptop
- Demo the project via public URLs

See `PRODUCTION_DEPLOYMENT.md` for detailed instructions on enabling production resources.

## Files Modified for Dev Mode

- `infra/s3.tf` - Commented out web and rules buckets
- `infra/customers.tf` - Commented out customer portal bucket and CloudFront
- `infra/outputs.tf` - Commented out production outputs
- `infra/variables.tf` - Changed default region to us-west-1

## Quick Commands

```bash
# Deploy infrastructure
cd infra && terraform apply

# Get API details
cd infra && terraform output

# Start Customer Portal
cd customer-portal && npm run dev

# Start Admin Portal
cd web && npm run dev

# View Lambda logs
aws logs tail /aws/lambda/cloud-golden-guard-dev-scan-handler --follow --region us-west-1

# List customers in DynamoDB
aws dynamodb scan --table-name cloud-golden-guard-dev-customers --region us-west-1

# Clean up (destroy all resources)
cd infra && terraform destroy
```

## Cost Breakdown

### What You're Paying For:

- **API Gateway:** ~$3-5/month (first 1M requests free, then $3.50 per million)
- **Lambda:** ~$1-2/month (first 1M requests + 400,000 GB-seconds free)
- **DynamoDB:** ~$1-2/month (25GB storage + 25 RCU/WCU free)
- **S3 Snapshots:** ~$0.50-1/month (first 5GB free, then $0.023/GB)
- **CloudWatch Logs:** ~$0.50/month (first 5GB free)

**Total: ~$5-10/month**

### What You're NOT Paying For (Commented Out):

- **S3 Website Hosting:** ~$0.50-2/month
- **CloudFront:** ~$1-5/month
- **Additional S3 Buckets:** ~$0.50/month

**Savings: ~$2-10/month**

## Troubleshooting

### Terraform shows resources that should be commented out

Run `terraform plan` and check the output. If you see `aws_s3_bucket.web`, `aws_s3_bucket.customer_portal`, or `aws_cloudfront_distribution.customer_portal`, the files weren't saved properly.

Solution:
```bash
cd infra
terraform plan | grep "will be created"
```

Should only show:
- API Gateway resources
- Lambda functions
- DynamoDB tables
- S3 snapshots bucket
- IAM roles
- CloudWatch log groups

### Can't connect to API from local portals

1. Check API URL in `.env` files
2. Verify API Gateway is deployed: `cd infra && terraform output api_url`
3. Check CORS is enabled in API Gateway
4. Verify API key is correct

### Lambda errors

Check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/cloud-golden-guard-dev-scan-handler --follow --region us-west-1
```

## Next Steps

1. ✅ Deploy infrastructure: `cd infra && terraform apply`
2. ✅ Update `.env` files with API URL and key
3. ✅ Start local development servers
4. ✅ Deploy CloudFormation role
5. ✅ Register a test customer
6. ✅ Run a scan and verify findings
7. 📖 When ready for production, see `PRODUCTION_DEPLOYMENT.md`
