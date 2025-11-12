# Quick Start Guide

Get Thanos running in 10 minutes.

## Prerequisites Check

```bash
# Verify installations
terraform --version  # >= 1.0
python --version     # >= 3.11
node --version       # >= 18
aws --version        # AWS CLI configured
```

## Step 1: Deploy Infrastructure (5 min)

```bash
# Install Python dependencies
pip install -r requirements-dev.txt

# Package Lambda functions
make package-lambdas

# Deploy with Terraform
cd infra
terraform init
terraform apply  # Type 'yes' when prompted

# Save outputs
terraform output api_url
terraform output -raw api_key > ../api_key.txt
```

## Step 2: Setup Customer Role (2 min)

In the customer AWS account:

```bash
aws cloudformation create-stack \
  --stack-name CloudGoldenGuardAuditRole \
  --template-body file://cfn/customer-onboarding-role.yaml \
  --parameters ParameterKey=TrustedAccountId,ParameterValue=$(aws sts get-caller-identity --query Account --output text) \
  --capabilities CAPABILITY_NAMED_IAM

# Get the role ARN
aws cloudformation describe-stacks \
  --stack-name CloudGoldenGuardAuditRole \
  --query 'Stacks[0].Outputs[?OutputKey==`RoleArn`].OutputValue' \
  --output text
```

## Step 3: Test API (1 min)

```bash
# Set environment variables
export API_URL=$(cd infra && terraform output -raw api_url)
export API_KEY=$(cat api_key.txt)
export ROLE_ARN="<from-step-2>"
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Run a scan
curl -X POST "$API_URL/scan" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenant_id\": \"test-tenant\",
    \"role_arn\": \"$ROLE_ARN\",
    \"account_id\": \"$ACCOUNT_ID\",
    \"regions\": [\"us-east-1\"],
    \"rules_source\": \"repo\"
  }"

# View findings
curl "$API_URL/findings?tenant_id=test-tenant" \
  -H "x-api-key: $API_KEY" | jq '.'
```

## Step 4: Launch Web UI (2 min)

```bash
cd web

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=$API_URL
VITE_API_KEY=$API_KEY
EOF

# Start dev server
npm run dev
```

Visit http://localhost:3000 and run a scan through the UI!

## Production Deployment

```bash
# Build and deploy web UI to S3
make web-build
make deploy-web

# Get web URL
cd infra && terraform output web_url
```

## Troubleshooting

### "Permission denied" when assuming role
- Verify trust relationship in customer role
- Check your AWS credentials have sts:AssumeRole permission

### Lambda timeout
- Increase timeout in `infra/lambda.tf` (line ~60)
- Reduce number of regions being scanned

### No findings returned
- Check CloudWatch Logs: `/aws/lambda/cloud-golden-guard-dev-scan-handler`
- Verify rules file exists at `rules/default.rules.yaml`

### Web UI not connecting
- Verify API_URL and API_KEY in `web/.env`
- Check browser console for CORS errors
- Ensure API Gateway is deployed

## Next Steps

1. **Customize rules**: Edit `rules/default.rules.yaml`
2. **Add more resource types**: Extend `lambdas/common/normalize.py`
3. **Set up CI/CD**: Automate deployments with GitHub Actions
4. **Monitor**: Set up CloudWatch alarms for Lambda errors
5. **Scale**: Add more regions and resource types

## Common Commands

```bash
# Redeploy Lambdas after code changes
make package-lambdas
cd infra && terraform apply

# View Lambda logs
aws logs tail /aws/lambda/cloud-golden-guard-dev-scan-handler --follow

# Run tests
make test

# Format code
make fmt

# Clean build artifacts
make clean
```

## Support

- Check `README.md` for detailed documentation
- Review `scripts/verify-deployment.sh` for deployment validation
- See `scripts/test-api.sh` for API testing examples
