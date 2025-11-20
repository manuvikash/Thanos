output "api_url" {
  description = "API Gateway URL"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "api_key" {
  description = "API Key for authentication"
  value       = random_password.api_key.result
  sensitive   = true
}

output "snapshots_bucket" {
  description = "S3 bucket for snapshots"
  value       = aws_s3_bucket.snapshots.id
}

output "rules_bucket" {
  description = "S3 bucket for rules"
  value       = aws_s3_bucket.rules.id
}

output "web_bucket" {
  description = "S3 bucket for web hosting"
  value       = aws_s3_bucket.web.id
}

output "web_url" {
  description = "Website URL"
  value       = "http://${aws_s3_bucket.web.bucket}.s3-website-${var.aws_region}.amazonaws.com"
}

output "cloudformation_template_url" {
  description = "URL for the customer onboarding CloudFormation template"
  value       = "https://${aws_s3_bucket.rules.bucket}.s3.amazonaws.com/templates/customer-onboarding-role.yaml"
}

output "trusted_account_id" {
  description = "AWS Account ID for trusted access (used in CloudFormation template)"
  value       = data.aws_caller_identity.current.account_id
}

output "findings_table" {
  description = "DynamoDB findings table"
  value       = aws_dynamodb_table.findings.name
}

output "customers_table" {
  description = "Customers DynamoDB table name"
  value       = aws_dynamodb_table.customers.name
}

# Commented out - uncomment when customer portal infrastructure is deployed
# output "customer_portal_url" {
#   description = "Customer Portal URL"
#   value       = "https://${aws_cloudfront_distribution.customer_portal.domain_name}"
# }
#
# output "customer_portal_bucket" {
#   description = "Customer Portal S3 bucket name"
#   value       = aws_s3_bucket.customer_portal.id
# }

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.client.id
}

output "admin_temporary_password" {
  description = "Temporary password for the admin user"
  value       = random_password.admin_password.result
  sensitive   = true
}
