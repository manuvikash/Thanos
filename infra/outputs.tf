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

# ============================================================================
# PRODUCTION OUTPUTS - COMMENTED OUT FOR LOCAL DEV TESTING
# Uncomment when production infrastructure is enabled
# ============================================================================

# output "rules_bucket" {
#   description = "S3 bucket for rules"
#   value       = aws_s3_bucket.rules.id
# }
#
# output "web_bucket" {
#   description = "S3 bucket for web hosting"
#   value       = aws_s3_bucket.web.id
# }
#
# output "web_url" {
#   description = "Website URL"
#   value       = "http://${aws_s3_bucket.web.bucket}.s3-website-${var.aws_region}.amazonaws.com"
# }

output "findings_table" {
  description = "DynamoDB findings table"
  value       = aws_dynamodb_table.findings.name
}

# output "customer_portal_url" {
#   description = "Customer Portal URL"
#   value       = "https://${aws_cloudfront_distribution.customer_portal.domain_name}"
# }
#
# output "customer_portal_bucket" {
#   description = "Customer Portal S3 bucket name"
#   value       = aws_s3_bucket.customer_portal.id
# }

output "customers_table" {
  description = "Customers DynamoDB table name"
  value       = aws_dynamodb_table.customers.name
}
