# IAM role for Config Handler Lambda
resource "aws_iam_role" "config_handler" {
  name = "${local.name_prefix}-config-handler"

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

resource "aws_iam_role_policy" "config_handler" {
  name = "config-handler-policy"
  role = aws_iam_role.config_handler.id

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
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.base_configs.arn,
          "${aws_dynamodb_table.base_configs.arn}/index/*"
        ]
      }
    ]
  })
}

# Config Handler Lambda function
resource "aws_lambda_function" "config_handler" {
  filename         = "${path.module}/../dist/config_handler.zip"
  function_name    = "${local.name_prefix}-config-handler"
  role            = aws_iam_role.config_handler.arn
  handler         = "app.lambda_handler"
  source_code_hash = filebase64sha256("${path.module}/../dist/config_handler.zip")
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      BASE_CONFIGS_TABLE = aws_dynamodb_table.base_configs.name
    }
  }

  tags = local.common_tags
}

# CloudWatch Log Group for Config Handler
resource "aws_cloudwatch_log_group" "config_handler" {
  name              = "/aws/lambda/${aws_lambda_function.config_handler.function_name}"
  retention_in_days = 7

  tags = local.common_tags
}

# Lambda permission for API Gateway to invoke Config Handler
resource "aws_lambda_permission" "config_handler" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.config_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# IAM role for Groups Handler Lambda
resource "aws_iam_role" "groups_handler" {
  name = "${local.name_prefix}-groups-handler"

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

resource "aws_iam_role_policy" "groups_handler" {
  name = "groups-handler-policy"
  role = aws_iam_role.groups_handler.id

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
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.resource_groups.arn,
          "${aws_dynamodb_table.resource_groups.arn}/index/*"
        ]
      }
    ]
  })
}

# Groups Handler Lambda function
resource "aws_lambda_function" "groups_handler" {
  filename         = "${path.module}/../dist/groups_handler.zip"
  function_name    = "${local.name_prefix}-groups-handler"
  role            = aws_iam_role.groups_handler.arn
  handler         = "app.lambda_handler"
  source_code_hash = filebase64sha256("${path.module}/../dist/groups_handler.zip")
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      RESOURCE_GROUPS_TABLE = aws_dynamodb_table.resource_groups.name
    }
  }

  tags = local.common_tags
}

# CloudWatch Log Group for Groups Handler
resource "aws_cloudwatch_log_group" "groups_handler" {
  name              = "/aws/lambda/${aws_lambda_function.groups_handler.function_name}"
  retention_in_days = 7

  tags = local.common_tags
}

# Lambda permission for API Gateway to invoke Groups Handler
resource "aws_lambda_permission" "groups_handler" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.groups_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
