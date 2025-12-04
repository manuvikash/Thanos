# IAM Role for Alerts Config Handler Lambda
resource "aws_iam_role" "alerts_config_handler" {
  name = "${local.name_prefix}-alerts-config-handler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "alerts_config_handler" {
  name = "${local.name_prefix}-alerts-config-handler-policy"
  role = aws_iam_role.alerts_config_handler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.alert_configs.arn
      }
    ]
  })
}

# Alerts Config Handler Lambda function
resource "aws_lambda_function" "alerts_config_handler" {
  filename         = "${path.module}/../dist/alerts_config_handler.zip"
  function_name    = "${local.name_prefix}-alerts-config-handler"
  role             = aws_iam_role.alerts_config_handler.arn
  handler          = "app.lambda_handler"
  source_code_hash = fileexists("${path.module}/../dist/alerts_config_handler.zip") ? filebase64sha256("${path.module}/../dist/alerts_config_handler.zip") : ""
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      ALERT_CONFIGS_TABLE = aws_dynamodb_table.alert_configs.name
      ALERTS_TOPIC_ARN    = aws_sns_topic.critical_findings_alerts.arn
    }
  }

  tags = local.common_tags
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "alerts_config_handler" {
  name              = "/aws/lambda/${aws_lambda_function.alerts_config_handler.function_name}"
  retention_in_days = 14

  tags = local.common_tags
}

output "alerts_config_handler_function_name" {
  value = aws_lambda_function.alerts_config_handler.function_name
}
