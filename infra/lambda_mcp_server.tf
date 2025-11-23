# IAM role for MCP server Lambda
resource "aws_iam_role" "mcp_server" {
  name = "${local.name_prefix}-mcp-server"

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

resource "aws_iam_role_policy" "mcp_server" {
  name = "mcp-server-policy"
  role = aws_iam_role.mcp_server.id

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
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.mcp_keys.arn
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          aws_lambda_function.customers_handler.arn,
          aws_lambda_function.findings_handler.arn,
          aws_lambda_function.resources_handler.arn,
          aws_lambda_function.metrics_handler.arn
        ]
      }
    ]
  })
}

# Lambda for hosted MCP server
resource "aws_lambda_function" "mcp_server" {
  filename         = "${path.module}/../dist/mcp_server.zip"
  function_name    = "${local.name_prefix}-mcp-server"
  role            = aws_iam_role.mcp_server.arn
  handler         = "server_hosted.lambda_handler"
  source_code_hash = filebase64sha256("${path.module}/../dist/mcp_server.zip")
  runtime         = "python3.11"
  timeout         = 900  # 15 minutes for long-running connections
  memory_size     = 512

  environment {
    variables = {
      MCP_KEYS_TABLE         = aws_dynamodb_table.mcp_keys.name
      CUSTOMERS_LAMBDA_NAME  = aws_lambda_function.customers_handler.function_name
      FINDINGS_LAMBDA_NAME   = aws_lambda_function.findings_handler.function_name
      RESOURCES_LAMBDA_NAME  = aws_lambda_function.resources_handler.function_name
      METRICS_LAMBDA_NAME    = aws_lambda_function.metrics_handler.function_name
    }
  }

  tags = local.common_tags
}

# CloudWatch Logs
resource "aws_cloudwatch_log_group" "mcp_server" {
  name              = "/aws/lambda/${aws_lambda_function.mcp_server.function_name}"
  retention_in_days = 7

  tags = local.common_tags
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "mcp_server_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.mcp_server.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# Lambda URL for direct invocation (alternative to API Gateway)
resource "aws_lambda_function_url" "mcp_server" {
  function_name      = aws_lambda_function.mcp_server.function_name
  authorization_type = "NONE"  # API key auth is handled in the function

  cors {
    allow_credentials = false
    allow_origins     = ["*"]
    allow_methods     = ["*"]
    allow_headers     = ["content-type", "x-api-key"]
    max_age           = 86400
  }
}

output "mcp_server_url" {
  value       = aws_lambda_function_url.mcp_server.function_url
  description = "MCP server endpoint URL"
}

output "mcp_server_lambda_arn" {
  value       = aws_lambda_function.mcp_server.arn
  description = "ARN of MCP server Lambda function"
}
