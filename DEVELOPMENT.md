# Development Guide

Quick reference for redeploying changes during development.

---

## Redeploy Web UI

**When:** Changed React/TypeScript files in `web/src/`

```bash
cd web
npm run build
WEB_BUCKET=$(cd ../infra && terraform output -raw web_bucket)
aws s3 sync dist/ s3://$WEB_BUCKET/ --delete
```

**Or use Make:**
```bash
make deploy-web
```

**Local dev (hot reload):**
```bash
cd web
npm run dev  # http://localhost:5173
```

---

## Redeploy Lambda Functions

**When:** Changed Python code in `lambdas/`

```bash
# Package updated Lambdas
make package-lambdas

# Redeploy with Terraform
cd infra
terraform apply
```

**Specific Lambda only:**
```bash
make package-lambdas
cd infra
terraform apply -target=aws_lambda_function.scan_handler
terraform apply -target=aws_lambda_function.findings_handler
terraform apply -target=aws_lambda_function.authorizer
```

---

## Update Infrastructure

**When:** Changed Terraform files in `infra/`

```bash
cd infra
terraform plan   # Review changes
terraform apply  # Apply changes
```

**For specific resources:**
```bash
terraform apply -target=aws_apigatewayv2_api.main
terraform apply -target=aws_dynamodb_table.findings
```

---

## Update Rules

**When:** Changed `rules/default.rules.yaml`

Rules are packaged with `scan_handler`, so:
```bash
make package-lambdas
cd infra
terraform apply -target=aws_lambda_function.scan_handler
```

**Or upload to S3 bucket:**
```bash
RULES_BUCKET=$(cd infra && terraform output -raw rules_bucket)
aws s3 cp rules/default.rules.yaml s3://$RULES_BUCKET/rules/default.rules.yaml
```

---

## Quick Reference

| **What Changed**          | **Command**                     |
|---------------------------|---------------------------------|
| React UI                  | `make deploy-web`               |
| Lambda code               | `make package-lambdas && cd infra && terraform apply` |
| Terraform config          | `cd infra && terraform apply`   |
| Rules YAML                | Redeploy scan_handler Lambda    |
| Environment variables     | Update `web/.env` + redeploy    |

---

## Development Workflow

### 1. Test Locally
```bash
# Web UI
cd web && npm run dev

# Lambda tests
cd lambdas/scan_handler && python -m pytest tests/ -v
cd lambdas/findings_handler && python -m pytest tests/ -v
```

### 2. Format Code
```bash
make fmt  # Formats Python and TypeScript
```

### 3. Run All Tests
```bash
make test
```

### 4. Deploy Changes
```bash
# Backend
make package-lambdas
cd infra && terraform apply

# Frontend
make deploy-web
```

---

## Debugging

### View Lambda Logs
```bash
# Scan handler
aws logs tail /aws/lambda/cloud-golden-guard-dev-scan-handler --follow

# Findings handler
aws logs tail /aws/lambda/cloud-golden-guard-dev-findings-handler --follow

# Authorizer
aws logs tail /aws/lambda/cloud-golden-guard-dev-authorizer --follow
```

### Test API Directly
```bash
export API_URL=$(cd infra && terraform output -raw api_url)
export API_KEY=$(cat api_key.txt)

# Test findings endpoint
curl "$API_URL/findings?tenant_id=test" -H "x-api-key: $API_KEY" | jq

# Test scan endpoint
curl -X POST "$API_URL/scan" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"test","role_arn":"arn:...","account_id":"123456789012","regions":["us-east-1"]}'
```

### Check Terraform State
```bash
cd infra
terraform state list              # List all resources
terraform state show aws_lambda_function.scan_handler
terraform output                  # Show all outputs
```

---

## Clean Rebuild

If things get messy:

```bash
# Clean all build artifacts
make clean

# Rebuild everything
make package-lambdas
cd infra && terraform apply

# Redeploy web
make deploy-web
```

---

## Destroy Everything

```bash
cd infra
terraform destroy  # Type 'yes'
```

Or:
```bash
make tf-destroy
```

**Warning:** This deletes all AWS resources including data in DynamoDB and S3.
