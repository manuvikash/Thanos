# Quick Start Guide

Get Thanos running in 15 minutes with customer management enabled.

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
terraform output customer_portal_url  # Share this with customers
```

## Step 2: Customer Registration (3 min)

### Option A: Self-Service Registration (Recommended)

**For Customers:**

1. Deploy the CloudFormation stack in your AWS account:
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

2. Access the Customer Portal URL (from Step 1)
3. Fill in the registration form:
   - **Tenant ID**: `my-company` (unique identifier)
   - **Customer Name**: `My Company`
   - **Role ARN**: (from CloudFormation output above)
   - **Account ID**: Your 12-digit AWS account ID
   - **Regions**: Select regions to scan (e.g., `us-east-1`)
4. Click **Register Customer**
5. Wait for success confirmation

### Option B: Manual Entry (Legacy)

Skip registration and manually enter credentials in the Admin Portal scan form.

**Note**: For detailed customer onboarding instructions, see `docs/CUSTOMER_ONBOARDING.md`

## Step 3: Test API (1 min)

### Option A: Test with Registered Customer

```bash
# Set environment variables
export API_URL=$(cd infra && terraform output -raw api_url)
export API_KEY=$(cat api_key.txt)

# Verify customer is registered
curl "$API_URL/customers" \
  -H "x-api-key: $API_KEY" | jq '.'

# Run a scan using registered customer's tenant_id
curl -X POST "$API_URL/scan" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "my-company",
    "role_arn": "arn:aws:iam::123456789012:role/CloudGoldenGuardAuditRole",
    "account_id": "123456789012",
    "regions": ["us-east-1"],
    "rules_source": "repo"
  }'

# View findings
curl "$API_URL/findings?tenant_id=my-company" \
  -H "x-api-key: $API_KEY" | jq '.'
```

### Option B: Test with Manual Entry

```bash
export API_URL=$(cd infra && terraform output -raw api_url)
export API_KEY=$(cat api_key.txt)
export ROLE_ARN="<your-role-arn>"
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

## Step 4: Launch Admin Portal (2 min)

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

### Using the Customer Dropdown

1. Open the Admin Portal at http://localhost:3000
2. Look for the **Customer** dropdown at the top of the scan form
3. Select a registered customer (e.g., "My Company")
4. Form fields auto-populate with customer details
5. Modify regions if needed (optional)
6. Click **Run Scan**
7. View findings in the results table

**Manual Entry**: Leave the dropdown unselected to manually enter credentials (legacy mode).

## Production Deployment

```bash
# Build and deploy Admin Portal to S3
make web-build
make deploy-web

# Build and deploy Customer Portal to S3
make package-customer-portal
make deploy-customer-portal

# Get URLs
cd infra
terraform output web_url              # Admin Portal
terraform output customer_portal_url  # Customer Portal (share with customers)
```

## Troubleshooting

### Customer Registration Issues

**Customer Portal not loading**
- Verify URL: `cd infra && terraform output customer_portal_url`
- CloudFront may take 5-10 minutes to deploy
- Clear browser cache and retry

**"Customer with tenant_id already exists"**
- Choose a different tenant_id (must be unique)

**Registration validation errors**
- Tenant ID: 3-50 characters, alphanumeric and hyphens only
- Role ARN: Must match format `arn:aws:iam::123456789012:role/RoleName`
- Account ID: Exactly 12 digits
- Regions: At least one region must be selected

### Admin Portal Issues

**Customer dropdown is empty**
- Verify customers registered via Customer Portal
- Check API key in `web/.env`
- Test: `curl "$API_URL/customers" -H "x-api-key: $API_KEY"`

**Customer selection not auto-populating**
- Check browser console for errors
- Refresh the page
- Verify customer data is complete

### Scan Issues

**"Permission denied" when assuming role**
- Verify trust relationship in customer role
- Check your AWS credentials have sts:AssumeRole permission
- Ensure role ARN is correct

**Lambda timeout**
- Increase timeout in `infra/lambda.tf` (line ~60)
- Reduce number of regions being scanned

**No findings returned**
- Check CloudWatch Logs: `/aws/lambda/cloud-golden-guard-dev-scan-handler`
- Verify rules file exists at `rules/default.rules.yaml`

**Web UI not connecting**
- Verify API_URL and API_KEY in `web/.env`
- Check browser console for CORS errors
- Ensure API Gateway is deployed

## Next Steps

1. **Onboard more customers**: Share Customer Portal URL for self-service registration
2. **Customize rules**: Edit `rules/default.rules.yaml`
3. **Add more resource types**: Extend `lambdas/common/normalize.py`
4. **Set up CI/CD**: Automate deployments with GitHub Actions
5. **Monitor**: Set up CloudWatch alarms for Lambda errors
6. **Scale**: Add more regions and resource types

## Customer Onboarding

For detailed customer onboarding instructions, see:
- **Quick reference**: README.md → Customer Management Workflow
- **Detailed guide**: `docs/CUSTOMER_ONBOARDING.md`

Share the Customer Portal URL with customers:
```bash
cd infra && terraform output customer_portal_url
```

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
- Review `docs/CUSTOMER_ONBOARDING.md` for customer onboarding
- Review `scripts/verify-deployment.sh` for deployment validation
- See `scripts/test-api.sh` for API testing examples
