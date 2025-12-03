# DynamoDB table for MCP API keys
resource "aws_dynamodb_table" "mcp_keys" {
  name           = "thanos-mcp-keys"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "api_key"

  attribute {
    name = "api_key"
    type = "S"
  }

  attribute {
    name = "user_email"
    type = "S"
  }

  global_secondary_index {
    name            = "user-email-index"
    hash_key        = "user_email"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Name = "Thanos MCP API Keys"
  }
}

output "mcp_keys_table_name" {
  value       = aws_dynamodb_table.mcp_keys.name
  description = "DynamoDB table name for MCP API keys"
}
