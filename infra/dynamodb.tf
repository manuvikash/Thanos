# DynamoDB table for findings
resource "aws_dynamodb_table" "findings" {
  name           = "${local.name_prefix}-findings"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "tenant_id"
  range_key      = "finding_id"
  
  attribute {
    name = "tenant_id"
    type = "S"
  }
  
  attribute {
    name = "finding_id"
    type = "S"
  }
  
  attribute {
    name = "rule_id"
    type = "S"
  }
  
  attribute {
    name = "timestamp"
    type = "S"
  }
  
  # GSI for querying by rule_id
  global_secondary_index {
    name            = "rule_id-timestamp-index"
    hash_key        = "rule_id"
    range_key       = "timestamp"
    projection_type = "ALL"
  }
  
  tags = merge(local.common_tags, {
    Name = "Findings Table"
  })
}
