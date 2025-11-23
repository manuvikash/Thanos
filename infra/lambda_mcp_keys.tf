# IAM role for MCP keys handler Lambda
resource "aws_iam_role" "mcp_keys_handler" {
  name = "${local.name_prefix}-mcp-keys-handler"

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

resource "aws_iam_role_policy" "mcp_keys_handler" {
  name = "mcp-keys-handler-policy"
  role = aws_iam_role.mcp_keys_handler.id

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
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.mcp_keys.arn,
          "${aws_dynamodb_table.mcp_keys.arn}/index/*"
        ]
      }
    ]
  })
}

# Lambda for MCP key management
resource "aws_lambda_function" "mcp_keys" {
  filename         = "${path.module}/../dist/mcp_keys_handler.zip"
  function_name    = "${local.name_prefix}-mcp-keys"
  role            = aws_iam_role.mcp_keys_handler.arn
  handler         = "app.lambda_handler"
  source_code_hash = filebase64sha256("${path.module}/../dist/mcp_keys_handler.zip")
  runtime         = "python3.11"
  timeout         = 30

  environment {
    variables = {
      MCP_KEYS_TABLE = aws_dynamodb_table.mcp_keys.name
    }
  }

  tags = local.common_tags
}

# CloudWatch Logs
resource "aws_cloudwatch_log_group" "mcp_keys" {
  name              = "/aws/lambda/${aws_lambda_function.mcp_keys.function_name}"
  retention_in_days = 7

  tags = local.common_tags
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "mcp_keys_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.mcp_keys.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

output "mcp_keys_lambda_arn" {
  value       = aws_lambda_function.mcp_keys.arn
  description = "ARN of MCP keys Lambda function"
}
