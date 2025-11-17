# Customer Onboarding Guide

This guide walks you through the process of onboarding your AWS account to Thanos for configuration drift detection.

## Overview

Thanos uses a secure AssumeRole mechanism to scan your AWS account. The onboarding process involves:

1. **Deploying a CloudFormation stack** in your AWS account that creates an IAM role
2. **Registering your account details** via the Customer Portal
3. **Verification** that scans can run successfully

The entire process takes approximately 5-10 minutes.

## Prerequisites

Before you begin, ensure you have:

- [ ] AWS CLI installed and configured
- [ ] AWS account credentials with permissions to:
  - Create CloudFormation stacks
  - Create IAM roles and policies
- [ ] The Thanos account ID (provided by your administrator)
- [ ] The Customer Portal URL (provided by your administrator)

## Step 1: Deploy CloudFormation Stack

The CloudFormation template creates an IAM role that allows Thanos to assume into your account and collect resource configurations.

### Option A: Deploy via AWS CLI

```bash
# Set the Thanos account ID (provided by your administrator)
export THANOS_ACCOUNT_ID="123456789012"

# Deploy the CloudFormation stack
aws cloudformation create-stack \
  --stack-name CloudGoldenGuardAuditRole \
  --template-body file://cfn/customer-onboarding-role.yaml \
  --parameters ParameterKey=TrustedAccountId,ParameterValue=$THANOS_ACCOUNT_ID \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Wait for stack creation to complete (takes ~1-2 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name CloudGoldenGuardAuditRole \
  --region us-east-1

# Get the role ARN (save this for Step 2)
aws cloudformation describe-stacks \
  --stack-name CloudGoldenGuardAuditRole \
  --query 'Stacks[0].Outputs[?OutputKey==`RoleArn`].OutputValue' \
  --output text \
  --region us-east-1
```

### Option B: Deploy via AWS Console

1. Download the CloudFormation template: `cfn/customer-onboarding-role.yaml`
2. Log in to the AWS Console
3. Navigate to **CloudFormation** service
4. Click **Create stack** → **With new resources (standard)**
5. Select **Upload a template file**
6. Upload `customer-onboarding-role.yaml`
7. Click **Next**
8. Enter stack details:
   - **Stack name**: `CloudGoldenGuardAuditRole`
   - **TrustedAccountId**: Enter the Thanos account ID provided by your administrator
9. Click **Next**
10. On the **Configure stack options** page, click **Next**
11. On the **Review** page:
    - Check the box: **I acknowledge that AWS CloudFormation might create IAM resources with custom names**
    - Click **Submit**
12. Wait for stack status to show **CREATE_COMPLETE** (~1-2 minutes)
13. Go to the **Outputs** tab and copy the **RoleArn** value (save this for Step 2)

### What Gets Created

The CloudFormation stack creates:

- **IAM Role**: `CloudGoldenGuardAuditRole`
  - Trust policy allowing Thanos account to assume the role
  - Read-only permissions for S3, IAM, and EC2 Security Groups
  - No write or delete permissions

**Security Note**: The role has read-only access and cannot modify your resources. You can review the exact permissions in the CloudFormation template.

## Step 2: Register via Customer Portal

Now that the IAM role is created, register your account details with Thanos.

### Access the Customer Portal

1. Open the Customer Portal URL provided by your administrator
   - Example: `https://d1234567890abc.cloudfront.net`
2. You should see the Thanos Customer Registration page

### Fill in the Registration Form

Complete the form with the following information:

#### Tenant ID
- **What it is**: A unique identifier for your organization
- **Format**: 3-50 characters, alphanumeric and hyphens only
- **Example**: `acme-corp`, `engineering-team`, `prod-account-123`
- **Tips**: 
  - Use lowercase for consistency
  - Include environment if you have multiple accounts (e.g., `acme-prod`, `acme-dev`)
  - This ID will appear in scan results and findings

#### Customer Name
- **What it is**: Your organization or team name (display name)
- **Format**: 1-100 characters
- **Example**: `Acme Corporation`, `Engineering Team`, `Production Account`
- **Tips**: Use a human-readable name that administrators will recognize

#### Role ARN
- **What it is**: The IAM role ARN from Step 1
- **Format**: `arn:aws:iam::123456789012:role/CloudGoldenGuardAuditRole`
- **Where to find it**: 
  - AWS CLI: Output from the `describe-stacks` command in Step 1
  - AWS Console: CloudFormation stack **Outputs** tab
- **Tips**: Copy and paste to avoid typos

#### Account ID
- **What it is**: Your 12-digit AWS account ID
- **Format**: Exactly 12 digits
- **Where to find it**:
  ```bash
  aws sts get-caller-identity --query Account --output text
  ```
  Or in AWS Console: Click your username in top-right → Account ID
- **Example**: `123456789012`

#### Regions
- **What it is**: AWS regions where Thanos will scan for resources
- **Format**: Multi-select dropdown
- **Common regions**:
  - `us-east-1` (N. Virginia)
  - `us-west-2` (Oregon)
  - `eu-west-1` (Ireland)
  - `ap-southeast-1` (Singapore)
- **Tips**: 
  - Select only regions where you have active resources
  - More regions = longer scan times
  - You can always ask administrators to modify this later

### Submit the Form

1. Review all fields for accuracy
2. Click **Register Customer**
3. Wait for confirmation message (should appear within 1-2 seconds)

### Success Confirmation

Upon successful registration, you'll see:

```
✓ Registration successful!

Your account has been registered with Thanos.
Administrators can now select your organization from the dropdown to run scans.

Next steps:
- Administrators will be notified of your registration
- Scans can be initiated from the Admin Portal
- You'll receive findings reports as configured
```

### Common Registration Errors

**"Customer with tenant_id 'xxx' already exists"**
- Solution: Choose a different tenant_id (the one you entered is already in use)

**"Invalid role_arn format"**
- Solution: Verify you copied the complete ARN from CloudFormation outputs
- Format should be: `arn:aws:iam::123456789012:role/CloudGoldenGuardAuditRole`

**"Invalid account_id format"**
- Solution: Ensure account ID is exactly 12 digits with no spaces or dashes

**"At least one region must be selected"**
- Solution: Select at least one AWS region from the dropdown

**"Unable to connect to server"**
- Solution: Check your internet connection and try again
- If problem persists, contact your administrator

## Step 3: Verification

After registration, administrators can verify your account is properly configured.

### Administrator Verification Steps

Administrators should:

1. Open the Admin Portal
2. Select your organization from the customer dropdown
3. Verify form fields auto-populate with your details
4. Click **Run Scan**
5. Verify scan completes successfully
6. Check findings appear in the results table

### What Happens During a Scan

When administrators run a scan on your account:

1. Thanos assumes the IAM role in your account
2. Collects configuration data for:
   - S3 buckets (encryption, versioning, public access settings)
   - IAM policies (overly permissive policies)
   - EC2 Security Groups (open ports, unrestricted access)
3. Compares configurations against golden rules
4. Generates findings for any drift or violations
5. Displays results in the Admin Portal

**Important**: Scans are read-only and do not modify your resources.

## Troubleshooting

### CloudFormation Stack Creation Failed

**Error: "User is not authorized to perform: iam:CreateRole"**
- Solution: Ensure your AWS credentials have IAM permissions
- Required permissions: `iam:CreateRole`, `iam:PutRolePolicy`, `iam:AttachRolePolicy`

**Error: "Stack already exists"**
- Solution: The stack name is already in use
- Either delete the existing stack or use a different stack name

### Registration Failed

**"Failed to register customer. Please try again."**
- Solution: This is a server error. Wait a moment and retry
- If problem persists, contact your administrator

### Scan Failures After Registration

**"Permission denied when assuming role"**
- Verify the trust relationship in the IAM role allows the Thanos account ID
- Check the role ARN is correct in your registration
- Ensure the role still exists (wasn't accidentally deleted)

**"No resources found"**
- This may be normal if you have no resources in the selected regions
- Verify you selected regions where you have active resources
- Check CloudWatch Logs for detailed error messages (administrators can do this)

## Security Best Practices

### Least Privilege Access

The CloudFormation template follows AWS security best practices:

- **Read-only permissions**: The role cannot create, modify, or delete resources
- **Scoped to specific services**: Only S3, IAM, and EC2 permissions
- **No data access**: Cannot read S3 object contents, only bucket configurations
- **Specific trust policy**: Only the Thanos account can assume the role

### Monitoring and Auditing

To monitor Thanos access to your account:

1. **CloudTrail**: Review AssumeRole events
   ```bash
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole \
     --query 'Events[?contains(CloudTrailEvent, `CloudGoldenGuardAuditRole`)]'
   ```

2. **IAM Access Analyzer**: Verify the role's permissions
   - Navigate to IAM → Access Analyzer
   - Review findings for the `CloudGoldenGuardAuditRole`

3. **Set up CloudWatch Alarms**: Get notified when the role is assumed
   ```bash
   # Create a metric filter for AssumeRole events
   aws logs put-metric-filter \
     --log-group-name /aws/cloudtrail/logs \
     --filter-name ThanosAssumeRole \
     --filter-pattern '{ $.eventName = "AssumeRole" && $.requestParameters.roleArn = "*CloudGoldenGuardAuditRole*" }' \
     --metric-transformations \
       metricName=ThanosAssumeRoleCount,metricNamespace=Security,metricValue=1
   ```

### Revoking Access

If you need to revoke Thanos access to your account:

1. **Delete the CloudFormation stack**:
   ```bash
   aws cloudformation delete-stack \
     --stack-name CloudGoldenGuardAuditRole \
     --region us-east-1
   ```

2. **Notify your administrator** to remove your registration from the system

3. **Verify deletion**:
   ```bash
   aws iam get-role --role-name CloudGoldenGuardAuditRole
   # Should return: "NoSuchEntity" error
   ```

## FAQ

### Q: Can Thanos modify my resources?

**A**: No. The IAM role has read-only permissions and cannot create, modify, or delete any resources in your account.

### Q: Can Thanos read my S3 object data?

**A**: No. The role can only read bucket configurations (encryption settings, versioning, etc.), not the actual objects stored in your buckets.

### Q: How often will scans run?

**A**: Scans are initiated manually by administrators. There is no automatic scheduled scanning. You can coordinate with your administrator on scan frequency.

### Q: What data is collected during scans?

**A**: Thanos collects configuration metadata only:
- S3: Bucket names, encryption settings, versioning status, public access settings
- IAM: Policy documents, role trust relationships
- Security Groups: Inbound/outbound rules, port configurations

No actual data content is collected.

### Q: Where is scan data stored?

**A**: Scan snapshots are stored in S3 buckets in the Thanos AWS account. Findings are stored in DynamoDB. All data is encrypted at rest.

### Q: Can I register multiple AWS accounts?

**A**: Yes. Repeat the onboarding process for each account, using a unique tenant_id for each (e.g., `acme-prod`, `acme-dev`, `acme-staging`).

### Q: Can I update my registration details?

**A**: Currently, registration updates must be done by administrators. Contact your administrator if you need to change regions, role ARN, or other details.

### Q: What if I rotate my IAM role?

**A**: If you delete and recreate the CloudFormation stack, the role ARN will remain the same. No action needed. If you create a new role with a different name, contact your administrator to update your registration.

### Q: Is there a cost to being scanned?

**A**: Scans generate minimal AWS API calls in your account. Costs are typically negligible (fractions of a cent per scan). The AssumeRole operation itself is free.

## Support

If you encounter issues during onboarding:

1. Review the **Troubleshooting** section above
2. Check the **FAQ** for common questions
3. Contact your Thanos administrator with:
   - Your tenant_id
   - Error messages (screenshots helpful)
   - CloudFormation stack status
   - AWS account ID

## Next Steps

After successful onboarding:

- ✓ Your account is registered and ready for scanning
- ✓ Administrators can select your organization from the dropdown
- ✓ Scans will run against your configured regions
- ✓ Findings will be available in the Admin Portal

**Welcome to Thanos!** Your AWS account is now protected by continuous configuration drift detection.
