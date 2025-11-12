# Thanos

A minimal AWS configuration drift detector that connects to customer AWS accounts, collects resource configurations, compares them against golden rules, and displays findings via a web UI.

## Features

- **AssumeRole-based access** to customer AWS accounts
- **Resource collection** for S3, IAM, and Security Groups
- **YAML-based golden rules** with flexible evaluation engine
- **Serverless architecture** using AWS Lambda and API Gateway
- **Modern web UI** built with React, TypeScript, and TailwindCSS
- **Infrastructure as Code** with Terraform

## Architecture

```
┌─────────────┐
│   Web UI    │ (React + Vite)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ API Gateway │ (HTTP API + API Key Auth)
└──────┬──────┘
       │
       ├─────────────────┬─────────────────┐
       ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Scan      │   │  Findings   │   │ Authorizer  │
│  Lambda     │   │   Lambda    │   │   Lambda    │
└──────┬──────┘   └──────┬──────┘   └─────────────┘
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│ S3 Buckets  │   │  DynamoDB   │
│ (Snapshots) │   │  (Findings) │
└─────────────┘   └─────────────┘
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

## Customer Onboarding

To allow the system to scan a customer AWS account, deploy the CloudFormation template in their account:

```bash
aws cloudformation create-stack \
  --stack-name CloudGoldenGuardAuditRole \
  --template-body file://cfn/customer-onboarding-role.yaml \
  --parameters ParameterKey=TrustedAccountId,ParameterValue=<your-account-id> \
  --capabilities CAPABILITY_NAMED_IAM
```

Get the role ARN:

```bash
aws cloudformation describe-stacks \
  --stack-name CloudGoldenGuardAuditRole \
  --query 'Stacks[0].Outputs[?OutputKey==`RoleArn`].OutputValue' \
  --output text
```

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
│   ├── lambda.tf
│   ├── dynamodb.tf
│   ├── s3.tf
│   ├── variables.tf
│   └── outputs.tf
├── lambdas/
│   ├── common/                   # Shared utilities
│   │   ├── aws.py
│   │   ├── eval.py
│   │   ├── models.py
│   │   ├── normalize.py
│   │   ├── s3io.py
│   │   ├── ddb.py
│   │   └── logging.py
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
├── web/                          # React web UI
│   ├── src/
│   │   ├── components/
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── Makefile
└── README.md
```

## Verification Checklist

After deployment, verify the system works:

- [ ] Terraform apply completed successfully
- [ ] API Gateway URL is accessible
- [ ] API key authentication works
- [ ] Lambda functions are deployed
- [ ] DynamoDB table exists
- [ ] S3 buckets are created
- [ ] Customer role can be assumed
- [ ] Scan endpoint returns results
- [ ] Findings endpoint returns data
- [ ] Web UI loads and displays data

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
