# DynamoDB table for alert configurations
resource "aws_dynamodb_table" "alert_configs" {
  provider     = aws.us_west_1
  name         = "${local.name_prefix}-alert-configs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  tags = merge(local.common_tags, {
    Name = "Alert Configurations Table"
  })
}

output "alert_configs_table_name" {
  value = aws_dynamodb_table.alert_configs.name
}
