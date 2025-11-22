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
python3 --version    # >= 3.11
node --version       # >= 18
aws configure        # AWS credentials set up
```

### 1. Deploy Backend Infrastructure

Use the Makefile to streamline the deployment process:

```bash
# Initialize Terraform (first time only)
make tf-init

# Deploy all infrastructure (packages Lambdas + applies Terraform)
make tf-apply
```

This command will:
- Package all Lambda functions with dependencies
- Deploy AWS infrastructure (API Gateway, Lambda, DynamoDB, S3, Cognito)
- Initialize default security rules
- Set up admin authentication

**Note:** You'll need to confirm the deployment by typing `yes` when prompted.

#### Optional: Configure Admin Email

By default, the admin email is `admin@example.com`. To customize it:

```bash
cd infra
terraform apply -var="admin_email=your-email@example.com"
```

#### Get Admin Credentials

After deployment completes, you'll need to retrieve your admin login credentials:

```bash
cd infra
terraform output -raw admin_temporary_password
```

**Default Admin Credentials:**
- **Email:** `admin@example.com` (or your custom email if you set one)
- **Password:** The output from the command above (temporary password)

**Important:** 
- Save this password securely - you'll need it for your first login
- You'll be required to change this password on first login
- The password will only be shown once via Terraform output

### 2. Run Web Application Locally

```bash
# The .env file is automatically created by make tf-apply
# Start the development server
make web-dev
```

The application will be available at `http://localhost:3001` (or another port if 3001 is in use).

### 3. Admin Login

**How to Login as Admin:**

1. Navigate to `http://localhost:3001/login`
2. Enter your admin credentials:
   - **Email:** `admin@example.com` (or your custom email)
   - **Password:** The temporary password from step 1
3. You'll be prompted to set a new permanent password
4. After setting your password, you'll be redirected to the admin dashboard

### 4. Deploy Web UI to S3 (Optional)

To deploy the web application to S3 for production:

```bash
make deploy-web
```

Access the deployed application:
```bash
cd infra
terraform output web_url
```

### 5. Create Customer Audit Role

For customers to allow Thanos to scan their AWS accounts:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws cloudformation create-stack \
  --stack-name CloudGoldenGuardAuditRole \
  --template-body file://cfn/customer-onboarding-role.yaml \
  --parameters ParameterKey=TrustedAccountId,ParameterValue=$ACCOUNT_ID \
  --capabilities CAPABILITY_NAMED_IAM
```

### 6. MCP Server Integration (Optional)

Enable AI assistants like Claude to query compliance data:

```bash
cd mcp
./setup.sh  # Creates service account and configures MCP server
```

Restart Claude Desktop, then ask: *"Show me all non-compliant S3 buckets for customer-prod"*

See [`mcp/README.md`](mcp/README.md) for details.

---

## Application Structure

### Two Portals

1. **Customer Portal** (`/register`) - Public access
   - Customer onboarding
   - No authentication required
   
2. **Admin Dashboard** (`/dashboard/*`) - Protected
   - Security findings and metrics
   - Rules management
   - Requires Cognito authentication

---

## What Gets Deployed

### AWS Resources

- **Lambda Functions** (9 total)
  - Scan handler, Findings handler, Resources handler
  - Metrics handler, Rules handler, Customers handler
  - Registration handler, Init handler, Authorizer
- **API Gateway** - HTTP API with JWT authorization
- **Cognito** - User pool for admin authentication
- **DynamoDB Tables** - Findings, Rules, Customers
- **S3 Buckets** - Snapshots, Rules, Web hosting
- **CloudWatch Logs** - 7-day retention for all functions

**Estimated Cost:** ~$1-5/month for light usage (serverless pay-per-use)

---

## Architecture

```
┌─────────────┐
│   Web UI    │ (React + TypeScript)
│  (S3/Local) │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  API Gateway    │ (JWT Auth via Cognito)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│      Lambda Functions               │
│  ┌──────────┐  ┌──────────┐        │
│  │  Scan    │  │ Findings │  ...   │
│  └──────────┘  └──────────┘        │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│    DynamoDB     │      │  S3 Buckets  │
│ (Findings/Rules)│      │ (Snapshots)  │
└─────────────────┘      └──────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   Customer AWS Account              │
│   (AssumeRole → Collect Resources)  │
└─────────────────────────────────────┘
```

---

## Development

### Available Make Commands

```bash
# Development
make web-dev          # Start Vite dev server
make fmt              # Format Python and TypeScript code
make test             # Run all tests

# Infrastructure
make tf-init          # Initialize Terraform
make tf-plan          # Plan Terraform changes
make tf-apply         # Apply Terraform changes (includes packaging)
make tf-destroy       # Destroy all AWS resources

# Deployment
make web-build        # Build web UI for production
make deploy-web       # Deploy web UI to S3

# Cleanup
make clean            # Remove build artifacts
```

### Local Development Workflow

```bash
# 1. Make code changes
# 2. Test locally
make web-dev

# 3. Deploy infrastructure changes
make tf-apply

# 4. Deploy web changes (optional)
make deploy-web
```

---

## Cleanup

### Destroy All Resources

To completely remove all AWS resources and stop incurring costs:

```bash
make tf-destroy
```

This command will:
1. Empty all S3 buckets (including versioned objects)
2. Destroy all AWS resources (Lambda, API Gateway, DynamoDB, Cognito, etc.)
3. Remove all infrastructure

**Warning:** This action is irreversible. All data will be permanently deleted.

---

## Features

✅ **Admin Authentication** - Secure Cognito-based login  
✅ **Customer Onboarding** - Self-service registration portal  
✅ **Multi-region Scanning** - Scan resources across AWS regions  
✅ **Custom Rules** - YAML-based security policies  
✅ **Multi-tenant** - Manage multiple AWS accounts  
✅ **Real-time Metrics** - Dashboard with findings analytics  
✅ **MCP Integration** - AI assistants can query compliance data  
✅ **Theme Support** - Midnight, Ocean Light, and Teal Dark themes  
✅ **Serverless** - No servers to manage, pay only for what you use  

---

## Tech Stack

**Frontend:** React, TypeScript, TailwindCSS, Vite, AWS Amplify  
**Backend:** AWS Lambda (Python 3.11), API Gateway, DynamoDB  
**Auth:** AWS Cognito  
**Infrastructure:** Terraform  
**Storage:** S3, DynamoDB  

---

## License

See [LICENSE](LICENSE) file for details.
