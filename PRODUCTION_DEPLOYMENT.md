# Production Deployment Guide

This document describes the infrastructure that has been commented out for local development testing and how to re-enable it when you're ready to deploy to production.

## Overview

For local development, the following production infrastructure has been disabled to avoid unnecessary AWS costs:

- **Admin Portal S3 Website Hosting** - Not needed when running `npm run dev` locally
- **Customer Portal S3 Website Hosting** - Not needed when running `npm run dev` locally
- **CloudFront Distribution** - CDN for Customer Portal (most expensive component)
- **Rules S3 Bucket** - Optional bucket for storing rules remotely

## What's Still Active (Required for Development)

These resources remain active because they're needed for local testing:

✅ **API Gateway** - Backend API endpoints  
✅ **Lambda Functions** - Scan, Findings, Registration, Customers handlers  
✅ **DynamoDB Tables** - Findings and Customers data storage  
✅ **S3 Snapshots Bucket** - Stores scan snapshots  
✅ **IAM Roles** - Lambda execution roles  
✅ **CloudWatch Log Groups** - Lambda logs  

**Estimated monthly cost for dev setup:** ~$5-10/month (mostly API Gateway and Lambda invocations)

## Commented Out Infrastructure

### 1. Admin Portal S3 Website Hosting

**Files:** `infra/s3.tf`

**Resources:**
- `aws_s3_bucket.web` - S3 bucket for hosting Admin Portal
- `aws_s3_bucket_website_configuration.web` - Website configuration
- `aws_s3_bucket_public_access_block.web` - Public access settings
- `aws_s3_bucket_policy.web` - Bucket policy for public read

**Cost:** ~$0.50-2/month (depending on traffic)

**Why disabled:** You're running Admin Portal locally with `npm run dev`

### 2. Customer Portal S3 Website Hosting

**Files:** `infra/customers.tf`

**Resources:**
- `aws_s3_bucket.customer_portal` - S3 bucket for hosting Customer Portal
- `aws_s3_bucket_website_configuration.customer_portal` - Website configuration
- `aws_s3_bucket_public_access_block.customer_portal` - Public access settings
- `aws_s3_bucket_policy.customer_portal` - Bucket policy for public read

**Cost:** ~$0.50-2/month (depending on traffic)

**Why disabled:** You're running Customer Portal locally with `npm run dev`

### 3. CloudFront Distribution

**Files:** `infra/customers.tf`

**Resources:**
- `aws_cloudfront_distribution.customer_portal` - CDN for Customer Portal

**Cost:** ~$1-5/month (minimum, can be higher with traffic)

**Why disabled:** Most expensive component, not needed for local development

### 4. Rules S3 Bucket (Optional)

**Files:** `infra/s3.tf`

**Resources:**
- `aws_s3_bucket.rules` - S3 bucket for storing rules
- `aws_s3_bucket_versioning.rules` - Versioning configuration
- `aws_s3_bucket_public_access_block.rules` - Access settings

**Cost:** ~$0.50/month

**Why disabled:** You're using local rules file (`rules/default.rules.yaml`)

### 5. Terraform Outputs

**Files:** `infra/outputs.tf`

**Outputs:**
- `web_bucket` - Admin Portal S3 bucket name
- `web_url` - Admin Portal URL
- `customer_portal_url` - Customer Portal CloudFront URL
- `customer_portal_bucket` - Customer Portal S3 bucket name
- `rules_bucket` - Rules S3 bucket name

**Why disabled:** These outputs reference commented-out resources

---

## When to Enable Production Infrastructure

Enable production infrastructure when you're ready to:

1. **Deploy Admin Portal** to a public URL (instead of localhost)
2. **Deploy Customer Portal** to a public URL for customers to access
3. **Share Customer Portal URL** with actual customers
4. **Run the system 24/7** without keeping your laptop running
5. **Demo the project** to others via public URLs

---

## How to Enable Production Infrastructure

### Step 1: Uncomment Infrastructure Resources

#### Enable Admin Portal Hosting

Edit `infra/s3.tf` and uncomment the section marked:
```
# ============================================================================
# PRODUCTION INFRASTRUCTURE - COMMENTED OUT FOR LOCAL DEV TESTING
```

Uncomment these resources:
- `aws_s3_bucket.web`
- `aws_s3_bucket_website_configuration.web`
- `aws_s3_bucket_public_access_block.web`
- `aws_s3_bucket_policy.web`

#### Enable Customer Portal Hosting

Edit `infra/customers.tf` and uncomment:
- `aws_s3_bucket.customer_portal`
- `aws_s3_bucket_public_access_block.customer_portal`
- `aws_s3_bucket_website_configuration.customer_portal`
- `aws_s3_bucket_policy.customer_portal`
- `aws_cloudfront_distribution.customer_portal`

#### Enable Rules Bucket (Optional)

Edit `infra/s3.tf` and uncomment:
- `aws_s3_bucket.rules`
- `aws_s3_bucket_versioning.rules`
- `aws_s3_bucket_public_access_block.rules`

### Step 2: Uncomment Terraform Outputs

Edit `infra/outputs.tf` and uncomment:
- `output "web_bucket"`
- `output "web_url"`
- `output "customer_portal_url"`
- `output "customer_portal_bucket"`
- `output "rules_bucket"` (if you enabled rules bucket)

### Step 3: Apply Terraform Changes

```bash
cd infra
terraform plan  # Review changes
terraform apply # Type 'yes' to create resources
```

**Expected new resources:**
- 2-3 S3 buckets (web, customer_portal, optionally rules)
- 1 CloudFront distribution
- 4-6 S3 bucket configurations
- 2-3 S3 bucket policies

**Time to deploy:** ~5-10 minutes (CloudFront takes the longest)

### Step 4: Build and Deploy Applications

#### Deploy Admin Portal

```bash
# Build production bundle
cd web
npm run build

# Deploy to S3
aws s3 sync dist/ s3://$(cd ../infra && terraform output -raw web_bucket)/ --delete --region us-west-1
```

#### Deploy Customer Portal

```bash
# Build production bundle
cd customer-portal
npm run build

# Deploy to S3
aws s3 sync dist/ s3://$(cd ../infra && terraform output -raw customer_portal_bucket)/ --delete --region us-west-1
```

### Step 5: Get Production URLs

```bash
cd infra

# Admin Portal URL
terraform output web_url

# Customer Portal URL (share this with customers)
terraform output customer_portal_url
```

### Step 6: Test Production Deployment

1. Access Admin Portal URL (from `terraform output web_url`)
2. Access Customer Portal URL (from `terraform output customer_portal_url`)
3. Test customer registration via production Customer Portal
4. Test customer dropdown in production Admin Portal
5. Verify scan functionality works
6. Check CloudWatch Logs for errors

---

## Production Deployment Checklist

Use this checklist when enabling production infrastructure:

### Pre-Deployment
- [ ] Uncomment resources in `infra/s3.tf`
- [ ] Uncomment resources in `infra/customers.tf`
- [ ] Uncomment outputs in `infra/outputs.tf`
- [ ] Review `terraform plan` output
- [ ] Verify you understand the cost implications

### Deployment
- [ ] Run `terraform apply`
- [ ] Wait for CloudFront distribution to deploy (~5-10 minutes)
- [ ] Build Admin Portal: `cd web && npm run build`
- [ ] Build Customer Portal: `cd customer-portal && npm run build`
- [ ] Deploy Admin Portal to S3
- [ ] Deploy Customer Portal to S3

### Verification
- [ ] Access Admin Portal URL
- [ ] Access Customer Portal URL
- [ ] Test customer registration via production Customer Portal
- [ ] Test customer dropdown in production Admin Portal
- [ ] Verify scan functionality works
- [ ] Check CloudWatch Logs for errors

### Post-Deployment
- [ ] Share Customer Portal URL with customers
- [ ] Update documentation with production URLs
- [ ] Set up CloudWatch alarms for monitoring
- [ ] Configure custom domain (optional)
- [ ] Set up SSL certificate with ACM (optional)

---

## Cost Estimates

### Development Setup (Current)
- API Gateway: ~$3-5/month
- Lambda: ~$1-2/month (free tier covers most)
- DynamoDB: ~$1-2/month (free tier covers most)
- S3 Snapshots: ~$0.50-1/month
- CloudWatch Logs: ~$0.50/month
- **Total: ~$5-10/month**

### Production Setup (With Hosting)
- Everything above: ~$5-10/month
- Admin Portal S3 + Website: ~$0.50-2/month
- Customer Portal S3 + Website: ~$0.50-2/month
- CloudFront Distribution: ~$1-5/month (can be higher with traffic)
- **Total: ~$7-20/month**

**Note:** Costs can increase with:
- More API calls
- More Lambda invocations
- More data stored in DynamoDB
- More CloudFront traffic
- More S3 storage

---

## Alternative: Partial Production Deployment

You can enable only what you need:

### Option 1: Admin Portal Only
Uncomment only Admin Portal resources in `infra/s3.tf`
- Use for internal team access
- Keep Customer Portal on localhost for testing

### Option 2: Customer Portal Only
Uncomment only Customer Portal resources in `infra/customers.tf`
- Share with customers for registration
- Keep Admin Portal on localhost for your use

### Option 3: S3 Only (No CloudFront)
Uncomment S3 resources but keep CloudFront commented out
- Use S3 website URLs (HTTP only)
- Save ~$1-5/month on CloudFront costs
- No CDN benefits (slower for global users)

---

## Reverting to Development Mode

If you want to go back to local-only development:

```bash
# Comment out the resources again in:
# - infra/s3.tf
# - infra/customers.tf
# - infra/outputs.tf

# Then apply changes
cd infra
terraform apply
```

**Warning:** This will delete the S3 buckets and CloudFront distribution. Make sure you don't have important data stored there.

---

## Custom Domain Setup (Optional)

If you want to use custom domains like `admin.yourdomain.com` and `portal.yourdomain.com`:

### Prerequisites
- Domain registered in Route 53 (or external registrar)
- ACM certificate for your domain (must be in us-east-1 for CloudFront)

### Steps

1. **Request ACM Certificate** (in us-east-1):
```bash
aws acm request-certificate \
  --domain-name "*.yourdomain.com" \
  --validation-method DNS \
  --region us-east-1
```

2. **Update CloudFront Distribution** in `infra/customers.tf`:
```terraform
resource "aws_cloudfront_distribution" "customer_portal" {
  # ... existing config
  
  aliases = ["portal.yourdomain.com"]
  
  viewer_certificate {
    acm_certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID"
    ssl_support_method  = "sni-only"
  }
}
```

3. **Create Route 53 Records**:
```terraform
resource "aws_route53_record" "customer_portal" {
  zone_id = "YOUR_ZONE_ID"
  name    = "portal.yourdomain.com"
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.customer_portal.domain_name
    zone_id                = aws_cloudfront_distribution.customer_portal.hosted_zone_id
    evaluate_target_health = false
  }
}
```

4. **Apply changes**:
```bash
terraform apply
```

---

## Monitoring and Maintenance

Once in production, monitor these metrics:

### CloudWatch Metrics
- Lambda invocations and errors
- API Gateway 4xx/5xx errors
- DynamoDB read/write capacity
- S3 bucket size

### Cost Monitoring
- Set up AWS Budgets alert for monthly spend
- Review Cost Explorer monthly
- Monitor CloudFront data transfer costs

### Security
- Review CloudTrail logs for API access
- Monitor IAM role usage
- Check S3 bucket policies regularly
- Rotate API keys periodically

---

## Support

If you encounter issues during production deployment:

1. Check Terraform plan output carefully
2. Review CloudWatch Logs for Lambda errors
3. Verify S3 bucket policies allow public read
4. Check CloudFront distribution status (takes 5-10 minutes to deploy)
5. Ensure DNS propagation is complete (if using custom domain)

For detailed troubleshooting, see:
- `README.md` - General troubleshooting
- `QUICKSTART.md` - Deployment issues
- `docs/CUSTOMER_ONBOARDING.md` - Customer-facing issues
- `DEV_MODE_SUMMARY.md` - Current dev setup

---

## Summary

**Current State (Development):**
- ✅ API Gateway, Lambda, DynamoDB active
- ✅ Local development with `npm run dev`
- ✅ Low cost (~$5-10/month)
- ❌ No public URLs for portals

**Production State (After Enabling):**
- ✅ Everything above
- ✅ Public Admin Portal URL
- ✅ Public Customer Portal URL (with HTTPS via CloudFront)
- ✅ Shareable with customers
- 💰 Higher cost (~$7-20/month)

**When to switch:** When you're ready to share the system with others or run it 24/7 without your laptop.
