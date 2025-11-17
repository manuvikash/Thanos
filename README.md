# Thanos

**AWS Configuration Drift Detector** - Scan AWS accounts for security misconfigurations in seconds.

## What It Does

Thanos connects to your AWS accounts, scans resources (S3, IAM, Security Groups), checks them against security rules, and shows you what's wrong.

**Example findings:**
- ❌ S3 buckets without public access blocks
- ❌ IAM policies with wildcard permissions
- ❌ Security groups allowing SSH from 0.0.0.0/0

---

## Quick Start

### Prerequisites
```bash
terraform --version  # >= 1.0
python --version     # >= 3.11
node --version       # >= 18
aws configure        # AWS credentials set up
```

### 1. Deploy Backend (2 minutes)
```bash
# Install dependencies and package Lambdas
pip install -r requirements-dev.txt
make package-lambdas

# Deploy AWS infrastructure
cd infra
terraform init
terraform apply  # Type 'yes'

# Save API credentials
terraform output -raw api_key > ../api_key.txt
```

### 2. Setup Web UI (1 minute)
```bash
cd ../web
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=$(cd ../infra && terraform output -raw api_url)
VITE_API_KEY=$(cat ../api_key.txt)
EOF

# Deploy to S3
npm run build
WEB_BUCKET=$(cd ../infra && terraform output -raw web_bucket)
aws s3 sync dist/ s3://$WEB_BUCKET/
```

### 3. Access Your App
```bash
cd ../infra
terraform output web_url  # Visit this URL
```

### 4. Create Audit Role (30 seconds)
```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws cloudformation create-stack \
  --stack-name CloudGoldenGuardAuditRole \
  --template-body file://cfn/customer-onboarding-role.yaml \
  --parameters ParameterKey=TrustedAccountId,ParameterValue=$ACCOUNT_ID \
  --capabilities CAPABILITY_NAMED_IAM
```

### 5. Run Your First Scan
1. Open the web URL from step 3
2. Enter your **Account ID** (12 digits)
3. Click **🚀 Quick Scan**
4. View findings!

---

## What Gets Deployed

- **3 Lambda functions** - Scan handler, Findings handler, Authorizer
- **API Gateway** - HTTP API with routes
- **DynamoDB** - Findings storage
- **3 S3 buckets** - Snapshots, rules, web hosting
- **CloudWatch Logs** - 7-day retention

**Cost:** ~$1-5/month for light usage (serverless pay-per-use)

---

## Architecture

```
Web UI (S3) → API Gateway → Lambda Functions → DynamoDB
                              ↓
                    AssumeRole → Customer AWS Account
                              ↓
                    Collect Resources → Evaluate Rules
```

---

## Development

```bash
# Local development
cd web && npm run dev        # http://localhost:5173

# Run tests
make test

# Destroy everything
make tf-destroy
```

---

## Features

✅ **One-click scanning** - Enter account ID, done  
✅ **Saved configurations** - Remember previous scans  
✅ **Multi-region support** - Scan multiple regions at once  
✅ **Custom rules** - YAML-based security policies  
✅ **Multi-tenant** - Manage multiple AWS accounts  
✅ **Serverless** - No servers to manage  

---

**Built with:** Terraform, AWS Lambda, API Gateway, DynamoDB, React, TypeScript, TailwindCSS
