# Customer Onboarding Implementation - Testing Guide

## Summary

Successfully implemented a complete customer onboarding flow for the Thanos (Cloud Golden Guard) security scanning system. The implementation matches the provided screenshot and includes CloudFormation-based IAM role provisioning.

## What Was Implemented

### 1. CloudFormation Template (`infra/customer-onboarding-role.yaml`)
- **Purpose**: Creates an IAM role in customer AWS accounts with read-only security audit permissions
- **Trust Relationship**: Role can be assumed by the Thanos main account (688513069023) with external ID
- **Permissions**: 
  - AWS managed policies: SecurityAudit, ViewOnlyAccess
  - Additional custom permissions for S3, EC2, RDS, Lambda, IAM, and CloudFormation read access
- **Parameters**: TrustedAccountId (the Thanos account ID)
- **Outputs**: Role ARN and Role Name

### 2. Frontend - New Onboarding Page (`web/src/pages/CustomerOnboarding.tsx`)
- **Route**: `/register`
- **Features**:
  - Clean, professional UI matching the provided screenshot
  - AWS Account ID input field (12-digit validation)
  - Region dropdown selector (supports all major AWS regions)
  - "Create Role via CloudFormation" button
  - "Verify & Save" button
  - Real-time validation and error/success messaging
  - Instructions section for users

### 3. Backend API Updates

#### New Lambda Function Logic (`lambdas/registration_handler/app.py`)
- **New Route**: `POST /customers/verify-and-register`
- **Functionality**:
  1. Validates account ID and regions
  2. Attempts to assume the CloudGoldenGuardAuditRole in customer account
  3. Verifies CloudFormation stack exists and is in CREATE_COMPLETE status
  4. Retrieves role ARN from stack outputs
  5. Generates tenant ID automatically (`customer-{account_id}`)
  6. Creates customer record in DynamoDB
  7. Returns success with tenant_id

#### Helper Functions Added:
- `verify_cloudformation_stack()` - Verifies stack exists
- `get_role_arn_from_stack()` - Retrieves role ARN from stack
- `generate_tenant_id()` - Creates tenant ID from account ID
- `handle_verify_and_register()` - Main verification handler

### 4. Infrastructure Updates

#### API Gateway (`infra/api_customers.tf`)
- Added new route: `POST /customers/verify-and-register`
- Both `/register` and `/verify-and-register` use the same Lambda integration
- No authentication required (public endpoint for onboarding)

#### Lambda IAM Permissions (`infra/lambda_customers.tf`)
- Added `sts:AssumeRole` permission
- Allows assuming roles matching pattern: `arn:aws:iam::*:role/CloudGoldenGuardAuditRole`

## How to Test the Complete Flow

### Prerequisites
- Access to an AWS account where you can create CloudFormation stacks
- AWS CLI configured with appropriate credentials

### Step 1: Access the Onboarding Page
**Local Development:**
```bash
cd web
npm run dev
# Open: http://localhost:3000/register
```

**Production:**
```
http://cloud-golden-guard-dev-web-5a4d6cdd.s3-website-us-west-1.amazonaws.com/register
```

### Step 2: Prepare Customer Account
1. Log into the AWS account you want to onboard (the "customer" account)
2. Note down the 12-digit Account ID
3. Choose a primary region (e.g., `us-west-1`)

### Step 3: Create CloudFormation Stack

**Option A: Using AWS Console (Recommended for Testing)**
1. Enter your Account ID and select region in the onboarding form
2. Click "Create Role via CloudFormation" button
3. AWS Console will open in a new tab
4. Choose "Upload a template file"
5. Upload: `/home/mrunal/Cloud Computing/Project/new/Thanos/infra/customer-onboarding-role.yaml`
6. On the parameters page, set:
   - `TrustedAccountId`: `688513069023`
7. Click through and create the stack
8. Wait for stack status to become `CREATE_COMPLETE` (usually 1-2 minutes)

**Option B: Using AWS CLI**
```bash
aws cloudformation create-stack \
  --stack-name CloudGoldenGuardAuditRole \
  --template-body file:///home/mrunal/Cloud\ Computing/Project/new/Thanos/infra/customer-onboarding-role.yaml \
  --parameters ParameterKey=TrustedAccountId,ParameterValue=688513069023 \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-west-1

# Check status
aws cloudformation describe-stacks \
  --stack-name CloudGoldenGuardAuditRole \
  --region us-west-1 \
  --query 'Stacks[0].StackStatus'
```

### Step 4: Verify and Register
1. Return to the onboarding page
2. Ensure Account ID and Region are filled
3. Click "I created the role → Verify & Save" button
4. The system will:
   - Verify the role can be assumed
   - Check the CloudFormation stack exists
   - Create a customer record in DynamoDB
   - Display success message with generated tenant ID

### Step 5: Verify Registration in DynamoDB
```bash
# Check the customers table
aws dynamodb scan \
  --table-name cloud-golden-guard-dev-customers \
  --region us-west-1

# Or get specific customer
aws dynamodb get-item \
  --table-name cloud-golden-guard-dev-customers \
  --key '{"tenant_id": {"S": "customer-YOUR_ACCOUNT_ID"}}' \
  --region us-west-1
```

### Expected DynamoDB Record Structure
```json
{
  "tenant_id": "customer-223518754080",
  "customer_name": "AWS-223518754080",
  "account_id": "223518754080",
  "role_arn": "arn:aws:iam::223518754080:role/CloudGoldenGuardAuditRole",
  "regions": ["us-west-1"],
  "created_at": "2025-11-20T20:45:32.123Z",
  "status": "active",
  "connectedAt": "2025-11-20T20:45:32.123Z"
}
```

## Testing the API Directly

```bash
# Test the verify-and-register endpoint
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"account_id": "223518754080", "regions": ["us-west-1"]}' \
  https://09ii6dke32.execute-api.us-west-1.amazonaws.com/customers/verify-and-register \
  | python3 -m json.tool
```

**Expected Success Response:**
```json
{
  "message": "Customer verified and registered successfully",
  "customer": {
    "tenant_id": "customer-223518754080",
    "customer_name": "AWS-223518754080",
    "role_arn": "arn:aws:iam::223518754080:role/CloudGoldenGuardAuditRole",
    "account_id": "223518754080",
    "regions": ["us-west-1"],
    "created_at": "2025-11-20T20:45:32.123Z",
    "status": "active"
  },
  "tenant_id": "customer-223518754080"
}
```

**Expected Error Responses:**

1. Stack doesn't exist:
```json
{
  "error": "CloudFormation stack 'CloudGoldenGuardAuditRole' not found or not in completed state. Please create the stack first."
}
```

2. Role can't be assumed:
```json
{
  "error": "Could not assume the IAM role. Please ensure the CloudFormation stack was created successfully and the role has the correct trust policy."
}
```

## Files Modified/Created

### New Files:
1. `/home/mrunal/Cloud Computing/Project/new/Thanos/infra/customer-onboarding-role.yaml` - CloudFormation template
2. `/home/mrunal/Cloud Computing/Project/new/Thanos/web/src/pages/CustomerOnboarding.tsx` - New onboarding page
3. `/home/mrunal/Cloud Computing/Project/new/Thanos/web/src/lib/utils.ts` - Utility functions (cn helper)
4. `/home/mrunal/Cloud Computing/Project/new/Thanos/web/src/lib/baseConfigTemplates.ts` - Template definitions

### Modified Files:
1. `lambdas/registration_handler/app.py` - Added verification logic
2. `web/src/api.ts` - Added verifyAndRegisterCustomer function
3. `web/src/App.tsx` - Updated route to use CustomerOnboarding component
4. `infra/api_customers.tf` - Added verify-and-register route
5. `infra/lambda_customers.tf` - Added STS assume role permissions
6. `web/.env` - Added VITE_TRUSTED_ACCOUNT_ID

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=https://09ii6dke32.execute-api.us-west-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID=us-west-1_EO1iGuprW
VITE_COGNITO_CLIENT_ID=1gru5p5etsr4vdvl1sf9mde4l8
VITE_TRUSTED_ACCOUNT_ID=688513069023
```

### Backend (Lambda Environment)
```
CUSTOMERS_TABLE=cloud-golden-guard-dev-customers
```

## Deployment Commands

```bash
# Package Lambda functions
make package-lambdas

# Deploy infrastructure
cd infra
terraform apply

# Build and deploy web frontend
cd web
npm run build
cd ..
make deploy-web
```

## URLs

- **Web UI**: http://cloud-golden-guard-dev-web-5a4d6cdd.s3-website-us-west-1.amazonaws.com
- **API**: https://09ii6dke32.execute-api.us-west-1.amazonaws.com
- **Onboarding Page**: http://cloud-golden-guard-dev-web-5a4d6cdd.s3-website-us-west-1.amazonaws.com/register

## Security Considerations

1. **IAM Role Trust Policy**: The CloudFormation stack creates a role that trusts account `688513069023` with an external ID `cloud-golden-guard-audit`
2. **Read-Only Access**: The role has SecurityAudit and ViewOnlyAccess policies - no write permissions
3. **No Authentication on Onboarding**: The `/verify-and-register` endpoint is public to allow new customers to register
4. **Verification**: The endpoint verifies the role exists and can be assumed before registration

## Troubleshooting

### Issue: "Could not assume the IAM role"
**Solution**: 
- Ensure CloudFormation stack is in CREATE_COMPLETE status
- Verify TrustedAccountId parameter is set to 688513069023
- Check the trust relationship in the IAM role

### Issue: "Stack not found"
**Solution**:
- Verify the stack name is exactly "CloudGoldenGuardAuditRole"
- Ensure stack is created in the same region you're testing
- Wait for stack creation to complete

### Issue: Customer already exists
**Solution**:
- Each account can only be registered once
- Use a different account ID or delete the existing record from DynamoDB

## Next Steps

After successful registration:
1. Customer appears in the customers dropdown
2. Can perform security scans using the registered role
3. View findings and compliance status
4. Manage rules and configurations for the tenant

## Complete!

All functionality has been implemented, tested, and deployed. The onboarding flow is ready for use!
