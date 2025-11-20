# DynamoDB table for custom rules
resource "aws_dynamodb_table" "rules" {
  provider       = aws.us_west_1
  name           = "${local.name_prefix}-rules"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "rule_id"
    type = "S"
  }

  # GSI to query all rules for a tenant
  global_secondary_index {
    name            = "TenantRulesIndex"
    hash_key        = "tenant_id"
    range_key       = "rule_id"
    projection_type = "ALL"
  }

  # GSI to query global rules
  global_secondary_index {
    name            = "GlobalRulesIndex"
    hash_key        = "SK"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = false
  }

  tags = merge(local.common_tags, {
    Name = "Rules Table"
  })
}
