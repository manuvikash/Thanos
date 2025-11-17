# Thanos

A minimal AWS configuration drift detector that connects to customer AWS accounts, collects resource configurations, compares them against golden rules, and displays findings via a web UI.

## Features

- **Customer self-registration** via dedicated Customer Portal
- **Dropdown-based customer selection** in Admin Portal for streamlined scanning
- **AssumeRole-based access** to customer AWS accounts
- **Resource collection** for S3, IAM, and Security Groups
- **YAML-based golden rules** with flexible evaluation engine
- **Serverless architecture** using AWS Lambda and API Gateway
- **Modern web UI** built with React, TypeScript, and TailwindCSS
- **Infrastructure as Code** with Terraform

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Thanos AWS Account                         │
│                                                                    │
│  ┌──────────────────┐                  ┌──────────────────┐     │
│  │ Customer Portal  │                  │  Admin Portal    │     │
│  │   (S3 + CF)      │                  │  (Enhanced UI)   │     │
│  └────────┬─────────┘                  └────────┬─────────┘     │
│           │                                      │                │
│           │ POST /customers/register             │ GET /customers│
│           │ (no auth)                            │ (API key)     │
│           │                                      │                │
│           └──────────────┬───────────────────────┘                │
│                          ▼                                        │
│                  ┌───────────────┐                                │
│                  │  API Gateway  │                                │
│                  └───────┬───────┘                                │
│                          │                                        │
│      ┌───────────────────┼───────────────────┐                   │
│      ▼                   ▼                   ▼                    │
│  ┌────────┐      ┌─────────────┐      ┌──────────┐              │
│  │ Reg.   │      │  Customers  │      │   Scan   │              │
│  │ Lambda │      │   Lambda    │      │  Lambda  │              │
│  └───┬────┘      └──────┬──────┘      └────┬─────┘              │
│      │                  │                   │                     │
│      └──────────┬───────┘                   │                     │
│                 ▼                           ▼                     │
│         ┌──────────────┐            ┌─────────────┐              │
│         │  Customers   │            │ S3 Buckets  │              │
│         │  DynamoDB    │            │ (Snapshots) │              │
│         └──────────────┘            └─────────────┘              │
│                                                                    │
│      ┌──────────────┐      ┌─────────────┐                       │
│      │  Findings    │      │ Authorizer  │                       │
│      │   Lambda     │      │   Lambda    │                       │
│      └──────┬───────┘      └─────────────┘                       │
│             ▼                                                     │
│      ┌─────────────┐                                              │
│      │  DynamoDB   │                                              │
│      │  (Findings) │                                              │
│      └─────────────┘                                              │
└──────────────────────────────────────────────────────────────────┘

Customer Flow:
1. Deploy CloudFormation in their AWS account
2. Access Customer Portal URL
3. Register account details (tenant_id, role_arn, etc.)
4. Admin selects customer from dropdown to run scans
```

## Prerequisites

- **AWS CLI** configured with credentials
- **Terraform** >= 1.0
- **Python** 3.11+
- **Node.js** 18+ and npm
- **Make** (for build automation)

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd cloud-golden-guard
```

### 2. Deploy Infrastructure

```bash
# Package Lambda functions
make package-lambdas

# Initialize and apply Terraform
make tf-init
make tf-apply
```

After deployment, save the outputs:

```bash
cd infra
terraform output api_url
terraform output -raw api_key
terraform output web_url
```

### 3. Configure Web UI

Create `web/.env`:

```bash
VITE_API_URL=<your-api-gateway-url>
VITE_API_KEY=<your-api-key>
```

### 4. Run Web UI (Development)

```bash
cd web
npm install
npm run dev
```

Visit `http://localhost:3000`

### 5. Deploy Web UI (Production)

```bash
make deploy-web
```

Access via the `web_url` from Terraform outputs.

## Customer Management Workflow

Thanos now features a streamlined customer management system that eliminates manual credential entry.

### For Administrators

After deploying Thanos infrastructure, retrieve the Customer Portal URL:

```bash
cd infra
terraform output customer_portal_url
```

Share this URL with customers for self-service registration.

### For Customers

**Step 1: Deploy CloudFormation Stack**

Deploy the audit role in your AWS account:

```bash
aws cloudformation create-stack \
  --stack-name CloudGoldenGuardAuditRole \
  --template-body file://cfn/customer-onboarding-role.yaml \
  --parameters ParameterKey=TrustedAccountId,ParameterValue=<thanos-account-id> \
  --capabilities CAPABILITY_NAMED_IAM
```

Get the role ARN:

```bash
aws cloudformation describe-stacks \
  --stack-name CloudGoldenGuardAuditRole \
  --query 'Stacks[0].Outputs[?OutputKey==`RoleArn`].OutputValue' \
  --output text
```

**Step 2: Register via Customer Portal**

1. Access the Customer Portal URL provided by your administrator
2. Fill in the registration form:
   - **Tenant ID**: Unique identifier for your organization (e.g., `acme-corp`)
   - **Customer Name**: Your organization name (e.g., `Acme Corporation`)
   - **Role ARN**: The ARN from Step 1
   - **Account ID**: Your 12-digit AWS account ID
   - **Regions**: Select AWS regions to scan
3. Submit the form
4. You'll receive a confirmation message upon successful registration

**Step 3: Scanning**

Once registered, administrators can select your organization from a dropdown in the Admin Portal to run scans. No manual credential entry required!

### Using the Admin Portal with Customer Dropdown

1. Open the Admin Portal
2. Select a customer from the dropdown menu at the top of the scan form
3. Form fields auto-populate with the customer's registered details
4. Modify regions if needed (optional)
5. Click "Run Scan"
6. View findings in the results table

**Manual Entry Mode**: The Admin Portal still supports manual credential entry for ad-hoc scans. Simply leave the customer dropdown unselected and fill in the form manually.

## API Usage

### Run a Scan

```bash
curl -X POST https://<api-url>/scan \
  -H "x-api-key: <api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "customer-123",
    "role_arn": "arn:aws:iam::123456789012:role/CloudGoldenGuardAuditRole",
    "account_id": "123456789012",
    "regions": ["us-east-1"],
    "rules_source": "repo"
  }'
```

### Get Findings

```bash
curl "https://<api-url>/findings?tenant_id=customer-123&limit=50" \
  -H "x-api-key: <api-key>"
```

## Golden Rules

Rules are defined in YAML format. See `rules/default.rules.yaml` for examples.

### Rule Structure

```yaml
rules:
  - id: rule-identifier
    resource_type: AWS::S3::Bucket  # or AWS::IAM::Policy, AWS::EC2::SecurityGroup
    selector: {}  # optional filters
    check:
      type: equals  # or forbidden-any, forbidden-cidr-port
      path: Config.Path.To.Value
      expected: true  # for equals
      forbidden: ["*"]  # for forbidden-any
      params:  # for forbidden-cidr-port
        port: 22
        cidr: "0.0.0.0/0"
    severity: HIGH  # CRITICAL, HIGH, MEDIUM, LOW
    message: "Human-readable violation message"
```

### Check Types

- **equals**: Exact value match
- **forbidden-any**: List must not contain forbidden values
- **forbidden-cidr-port**: Security group must not allow port from CIDR

## Development

### Format Code

```bash
make fmt
```

### Run Tests

```bash
# Install Python test dependencies
pip install pytest pytest-mock black ruff

# Install Node dependencies
cd web && npm install

# Run all tests
make test
```

### Local Development Mode

For local testing without deploying infrastructure:

1. Set up local environment variables
2. Use `rules_source: "repo"` to load rules from `rules/default.rules.yaml`
3. Mock AWS credentials for testing

## Project Structure

```
cloud-golden-guard/
├── cfn/                          # CloudFormation templates
│   └── customer-onboarding-role.yaml
├── infra/                        # Terraform configuration
│   ├── main.tf
│   ├── api.tf
│   ├── api_customers.tf          # Customer management API routes
│   ├── lambda.tf
│   ├── lambda_customers.tf       # Customer management Lambdas
│   ├── customers.tf              # Customer DynamoDB table & portal
│   ├── dynamodb.tf
│   ├── s3.tf
│   ├── variables.tf
│   └── outputs.tf
├── lambdas/
│   ├── common/                   # Shared utilities
│   │   ├── aws.py
│   │   ├── customer_models.py    # Customer data models
│   │   ├── eval.py
│   │   ├── models.py
│   │   ├── normalize.py
│   │   ├── s3io.py
│   │   ├── ddb.py
│   │   └── logging.py
│   ├── registration_handler/     # Customer registration Lambda
│   │   ├── app.py
│   │   └── requirements.txt
│   ├── customers_handler/        # Customer list Lambda
│   │   ├── app.py
│   │   └── requirements.txt
│   ├── scan_handler/             # Scan Lambda
│   │   ├── app.py
│   │   ├── requirements.txt
│   │   └── tests/
│   ├── findings_handler/         # Findings Lambda
│   │   ├── app.py
│   │   ├── requirements.txt
│   │   └── tests/
│   └── authorizer/               # API Key authorizer
│       └── authorizer.py
├── rules/
│   └── default.rules.yaml        # Default golden rules
├── customer-portal/              # Customer registration portal
│   ├── src/
│   │   ├── components/
│   │   │   └── RegistrationForm.tsx
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── web/                          # Admin Portal (React web UI)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CustomerSelector.tsx  # Customer dropdown
│   │   │   ├── ScanForm.tsx
│   │   │   └── FindingsTable.tsx
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   └── CUSTOMER_ONBOARDING.md    # Detailed customer onboarding guide
├── Makefile
├── README.md
└── QUICKSTART.md
```

## Verification Checklist

After deployment, verify the system works:

- [ ] Terraform apply completed successfully
- [ ] API Gateway URL is accessible
- [ ] API key authentication works
- [ ] Lambda functions are deployed (scan, findings, registration, customers)
- [ ] DynamoDB tables exist (findings, customers)
- [ ] S3 buckets are created (snapshots, customer portal)
- [ ] Customer Portal URL is accessible
- [ ] Customer registration works via portal
- [ ] Admin Portal loads customer dropdown
- [ ] Customer selection auto-populates form fields
- [ ] Customer role can be assumed
- [ ] Scan endpoint returns results
- [ ] Findings endpoint returns data

### Test Scan (Manual)

```bash
# Export variables
export API_URL=$(cd infra && terraform output -raw api_url)
export API_KEY=$(cd infra && terraform output -raw api_key)

# Test scan endpoint
curl -X POST $API_URL/scan \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "test-tenant",
    "role_arn": "arn:aws:iam::YOUR_ACCOUNT:role/CloudGoldenGuardAuditRole",
    "account_id": "YOUR_ACCOUNT",
    "regions": ["us-east-1"],
    "rules_source": "repo"
  }'

# Test findings endpoint
curl "$API_URL/findings?tenant_id=test-tenant" \
  -H "x-api-key: $API_KEY"
```

## Cleanup

To destroy all resources:

```bash
make tf-destroy
```

## Security Considerations

- **API Key**: Store securely, rotate regularly
- **IAM Roles**: Follow least-privilege principle
- **Customer Data**: Snapshots contain sensitive config data
- **Network**: Consider VPC endpoints for Lambda
- **Encryption**: S3 buckets use AES256, consider KMS

## Troubleshooting

### Customer Registration Issues

**"Customer with tenant_id already exists"**
- The tenant_id must be unique. Choose a different identifier.

**Registration form validation errors**
- Ensure tenant_id is 3-50 characters, alphanumeric and hyphens only
- Verify role ARN follows format: `arn:aws:iam::123456789012:role/RoleName`
- Account ID must be exactly 12 digits
- At least one region must be selected

**Customer Portal not loading**
- Verify the Customer Portal URL from `terraform output customer_portal_url`
- Check CloudFront distribution status (may take 5-10 minutes after deployment)
- Clear browser cache and try again

### Admin Portal Issues

**Customer dropdown is empty**
- Verify customers have registered via the Customer Portal
- Check API key is configured in `web/.env`
- Check browser console for API errors
- Verify `/customers` endpoint returns data:
  ```bash
  curl "$API_URL/customers" -H "x-api-key: $API_KEY"
  ```

**Customer selection not auto-populating fields**
- Check browser console for JavaScript errors
- Verify customer data includes all required fields
- Try refreshing the page

### Lambda Timeout

Increase timeout in `infra/lambda.tf` if scanning large accounts.

### Permission Denied

Verify the customer role has required permissions and trust relationship.

### No Findings

Check CloudWatch Logs for Lambda execution errors:

```bash
aws logs tail /aws/lambda/cloud-golden-guard-dev-scan-handler --follow
```

### Web UI Not Loading

1. Check API URL and key in `.env`
2. Verify CORS is enabled in API Gateway
3. Check browser console for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and add tests
4. Run `make fmt` and `make test`
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please open a GitHub issue.
