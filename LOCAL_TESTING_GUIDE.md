# Local Testing Guide

This guide walks you through testing the customer management system locally after running `terraform apply`.

## Prerequisites

✅ Terraform infrastructure deployed (`terraform apply` completed)
✅ AWS resources created (DynamoDB, Lambda, API Gateway, S3, CloudFront)

## Step-by-Step Testing Process

### Step 1: Verify Environment Variables

Both portals need the API URL configured.

**Admin Portal** (`web/.env`):
```bash
cat web/.env
# Should show:
# VITE_API_URL=https://mmv4hr4bxc.execute-api.us-east-1.amazonaws.com
# VITE_API_KEY=7kdcav1agYBlQY3gS5KPtIiFStz0sH9M
```

**Customer Portal** (`customer-portal/.env`):
```bash
cat customer-portal/.env
# Should show:
# VITE_API_URL=https://mmv4hr4bxc.execute-api.us-east-1.amazonaws.com
```

✅ Both `.env` files are now configured!

---

### Step 2: Install Dependencies

Install npm packages for both portals (if not already done):

```bash
# Install Admin Portal dependencies
cd web
npm install
cd ..

# Install Customer Portal dependencies
cd customer-portal
npm install
cd ..
```

---

### Step 3: Test API Endpoints

Before starting the UIs, verify the API endpoints work:

```bash
# Set environment variables
export API_URL="https://mmv4hr4bxc.execute-api.us-east-1.amazonaws.com"
export API_KEY="7kdcav1agYBlQY3gS5KPtIiFStz0sH9M"

# Test GET /customers (should return empty array initially)
curl "$API_URL/customers" -H "x-api-key: $API_KEY"
# Expected: {"customers":[]}

# Test POST /customers/register (no API key needed)
curl -X POST "$API_URL/customers/register" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "test-customer",
    "customer_name": "Test Customer Inc",
    "role_arn": "arn:aws:iam::123456789012:role/CloudGoldenGuardAuditRole",
    "account_id": "123456789012",
    "regions": ["us-east-1", "us-west-2"]
  }'
# Expected: {"message":"Customer registered successfully"}

# Verify customer was created
curl "$API_URL/customers" -H "x-api-key: $API_KEY"
# Expected: {"customers":[{"tenant_id":"test-customer",...}]}
```

**Expected Results:**
- ✅ GET /customers returns JSON with customers array
- ✅ POST /customers/register returns success message
- ✅ Customer appears in subsequent GET requests

**If you see errors:**
- Check Lambda logs in CloudWatch
- Verify DynamoDB table exists
- Ensure API Gateway routes are deployed

---

### Step 4: Start Customer Portal (Terminal 1)

```bash
cd customer-portal
npm run dev
```

**Expected output:**
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Test Customer Portal:**
1. Open browser to http://localhost:5173/
2. You should see the "Thanos Customer Registration" page
3. Fill in the form:
   - **Tenant ID**: `my-company`
   - **Customer Name**: `My Company Inc`
   - **Role ARN**: `arn:aws:iam::123456789012:role/CloudGoldenGuardAuditRole`
   - **Account ID**: `123456789012`
   - **Regions**: Select `us-east-1` and `us-west-2`
4. Click "Register Customer"
5. You should see: ✓ "Registration successful!"

**Troubleshooting:**
- If you see CORS errors, check that the API Gateway has CORS enabled
- If registration fails, check browser console for error details
- Verify the API URL in `customer-portal/.env` is correct

---

### Step 5: Start Admin Portal (Terminal 2)

Open a new terminal window:

```bash
cd web
npm run dev
```

**Expected output:**
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

**Test Admin Portal:**
1. Open browser to http://localhost:3000/
2. You should see the "Thanos" admin interface
3. Look for the **Customer** dropdown at the top of the scan form
4. Click the dropdown - you should see "My Company Inc" (or any customers you registered)
5. Select "My Company Inc"
6. Form fields should auto-populate:
   - Tenant ID: `my-company`
   - Role ARN: `arn:aws:iam::123456789012:role/CloudGoldenGuardAuditRole`
   - Account ID: `123456789012`
   - Regions: `us-east-1,us-west-2`

**Troubleshooting:**
- If dropdown is empty, check browser console for errors
- Verify GET /customers API call succeeds (check Network tab)
- Ensure API key is correct in `web/.env`

---

### Step 6: Test End-to-End Flow

Now test the complete workflow:

#### 6.1 Register a New Customer (Customer Portal)

1. Go to http://localhost:5173/
2. Register a second customer:
   - **Tenant ID**: `acme-corp`
   - **Customer Name**: `Acme Corporation`
   - **Role ARN**: `arn:aws:iam::987654321098:role/CloudGoldenGuardAuditRole`
   - **Account ID**: `987654321098`
   - **Regions**: Select `us-east-1`
3. Verify success message

#### 6.2 Verify Customer Appears in Admin Portal

1. Go to http://localhost:3000/
2. Refresh the page (or click the dropdown)
3. You should now see both customers:
   - My Company Inc
   - Acme Corporation

#### 6.3 Test Customer Selection

1. Select "Acme Corporation" from dropdown
2. Verify form auto-populates with Acme's details
3. Click "Clear Selection" button
4. Form should reset to manual entry mode
5. Select "My Company Inc"
6. Form should auto-populate with My Company's details

#### 6.4 Test Manual Entry Mode

1. Leave customer dropdown unselected
2. Manually enter scan details:
   - Tenant ID: `manual-test`
   - Role ARN: `arn:aws:iam::111111111111:role/TestRole`
   - Account ID: `111111111111`
   - Regions: `us-east-1`
3. This tests backward compatibility with the old workflow

---

### Step 7: Test Validation

Test that validation works correctly:

#### Customer Portal Validation

Try registering with invalid data:

1. **Invalid Tenant ID** (too short):
   - Tenant ID: `ab`
   - Should show error: "Tenant ID must be 3-50 characters"

2. **Invalid Role ARN**:
   - Role ARN: `not-a-valid-arn`
   - Should show error: "Invalid role ARN format"

3. **Invalid Account ID**:
   - Account ID: `12345` (too short)
   - Should show error: "Account ID must be exactly 12 digits"

4. **Duplicate Tenant ID**:
   - Try registering with tenant_id `my-company` again
   - Should show error: "Customer with tenant_id 'my-company' already exists"

5. **No Regions Selected**:
   - Leave regions empty
   - Should show error: "At least one region must be selected"

---

### Step 8: Verify Data in AWS Console

Check that data is being stored correctly:

#### DynamoDB Table

1. Go to AWS Console → DynamoDB → Tables
2. Find table: `cloud-golden-guard-dev-customers`
3. Click "Explore table items"
4. You should see your registered customers:
   - `test-customer`
   - `my-company`
   - `acme-corp`
5. Click on an item to see all attributes:
   - tenant_id
   - customer_name
   - role_arn
   - account_id
   - regions
   - created_at
   - updated_at

#### Lambda Logs

Check that Lambdas are executing correctly:

1. Go to AWS Console → CloudWatch → Log groups
2. Check Registration Lambda logs:
   - `/aws/lambda/cloud-golden-guard-dev-registration-handler`
   - Should see log entries for each registration attempt
3. Check Customers Lambda logs:
   - `/aws/lambda/cloud-golden-guard-dev-customers-handler`
   - Should see log entries for each GET /customers request

---

## Testing Checklist

Use this checklist to verify everything works:

### API Endpoints
- [ ] GET /customers returns customer list
- [ ] POST /customers/register creates new customer
- [ ] POST /customers/register rejects duplicate tenant_id
- [ ] POST /customers/register validates input fields

### Customer Portal
- [ ] Portal loads at http://localhost:5173/
- [ ] Registration form displays correctly
- [ ] Form validation works (invalid inputs show errors)
- [ ] Successful registration shows success message
- [ ] Duplicate registration shows error message
- [ ] Multi-select regions dropdown works

### Admin Portal
- [ ] Portal loads at http://localhost:3000/
- [ ] Customer dropdown appears in scan form
- [ ] Dropdown populates with registered customers
- [ ] Selecting customer auto-fills form fields
- [ ] "Clear Selection" button resets form
- [ ] Manual entry mode still works (backward compatibility)
- [ ] Regions field shows selected regions from customer record

### Data Persistence
- [ ] Customers appear in DynamoDB table
- [ ] Customer data includes all required fields
- [ ] Timestamps (created_at, updated_at) are set
- [ ] Lambda logs show successful executions

---

## Common Issues and Solutions

### Issue: Customer dropdown is empty

**Symptoms:** Admin Portal loads but dropdown has no customers

**Solutions:**
1. Check browser console for errors
2. Verify API call succeeds: Open Network tab, look for GET /customers
3. Test API manually: `curl "$API_URL/customers" -H "x-api-key: $API_KEY"`
4. Check that customers exist in DynamoDB
5. Verify API key is correct in `web/.env`

### Issue: CORS errors in browser console

**Symptoms:** "Access to fetch at '...' has been blocked by CORS policy"

**Solutions:**
1. Verify API Gateway has CORS enabled
2. Check that the API URL in `.env` files is correct
3. Try redeploying API Gateway: `cd infra && terraform apply`
4. Clear browser cache and hard refresh (Cmd+Shift+R)

### Issue: Registration fails with 500 error

**Symptoms:** Customer Portal shows "Failed to register customer"

**Solutions:**
1. Check Lambda logs in CloudWatch
2. Verify DynamoDB table exists and Lambda has permissions
3. Check that CUSTOMERS_TABLE environment variable is set in Lambda
4. Test Lambda directly in AWS Console

### Issue: Form fields don't auto-populate

**Symptoms:** Selecting customer from dropdown doesn't fill form

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify customer data includes all required fields
3. Refresh the page and try again
4. Check that CustomerSelector component is properly integrated

### Issue: "Failed to fetch" error

**Symptoms:** Network errors when calling API

**Solutions:**
1. Verify API URL is correct in `.env` files
2. Check that API Gateway is deployed
3. Test API with curl to isolate issue
4. Verify internet connection

---

## Next Steps After Local Testing

Once local testing is complete and everything works:

1. **Deploy Customer Portal to S3/CloudFront**:
   ```bash
   make package-customer-portal
   make deploy-customer-portal
   ```

2. **Deploy Admin Portal to S3**:
   ```bash
   cd web
   npm run build
   cd ..
   make deploy-web
   ```

3. **Get Production URLs**:
   ```bash
   cd infra
   terraform output customer_portal_url  # Share with customers
   terraform output web_url              # Admin Portal URL
   ```

4. **Share Customer Portal URL** with your customers for self-service registration

5. **Monitor Usage**:
   - Check CloudWatch Logs for Lambda executions
   - Monitor DynamoDB for new customer registrations
   - Review API Gateway metrics

---

## Clean Up Test Data

If you want to remove test customers:

```bash
# Delete a customer from DynamoDB
aws dynamodb delete-item \
  --table-name cloud-golden-guard-dev-customers \
  --key '{"tenant_id": {"S": "test-customer"}}'

# Or delete all items (be careful!)
aws dynamodb scan \
  --table-name cloud-golden-guard-dev-customers \
  --attributes-to-get tenant_id \
  --query 'Items[*].tenant_id.S' \
  --output text | \
  xargs -I {} aws dynamodb delete-item \
    --table-name cloud-golden-guard-dev-customers \
    --key '{"tenant_id": {"S": "{}"}}'
```

---

## Support

If you encounter issues not covered in this guide:

1. Check `docs/CUSTOMER_ONBOARDING.md` for detailed customer-facing documentation
2. Review `README.md` for architecture and troubleshooting
3. Check CloudWatch Logs for Lambda execution errors
4. Verify all Terraform resources were created successfully

Happy testing! 🚀
