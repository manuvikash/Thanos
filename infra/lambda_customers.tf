# IAM role for Registration Lambda
resource "aws_iam_role" "registration_handler" {
  name = "${local.name_prefix}-registration-handler"

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

resource "aws_iam_role_policy" "registration_handler" {
  name = "registration-handler-policy"
  role = aws_iam_role.registration_handler.id

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
          "dynamodb:GetItem"
        ]
        Resource = aws_dynamodb_table.customers.arn
      },
      {
        Effect = "Allow"
        Action = [
          "sts:AssumeRole"
        ]
        Resource = "arn:aws:iam::*:role/CloudGoldenGuardAuditRole"
      }
    ]
  })
}

# Registration Lambda function
resource "aws_lambda_function" "registration_handler" {
  filename         = "${path.module}/../dist/registration_handler.zip"
  function_name    = "${local.name_prefix}-registration-handler"
  role             = aws_iam_role.registration_handler.arn
  handler          = "app.lambda_handler"
  source_code_hash = fileexists("${path.module}/../dist/registration_handler.zip") ? filebase64sha256("${path.module}/../dist/registration_handler.zip") : ""
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      CUSTOMERS_TABLE = aws_dynamodb_table.customers.name
    }
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "registration_handler" {
  name              = "/aws/lambda/${aws_lambda_function.registration_handler.function_name}"
  retention_in_days = 7

  tags = local.common_tags
}

# IAM role for Customers Lambda
resource "aws_iam_role" "customers_handler" {
  name = "${local.name_prefix}-customers-handler"

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

resource "aws_iam_role_policy" "customers_handler" {
  name = "customers-handler-policy"
  role = aws_iam_role.customers_handler.id

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
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.customers.arn
      }
    ]
  })
}

# Customers Lambda function
resource "aws_lambda_function" "customers_handler" {
  filename         = "${path.module}/../dist/customers_handler.zip"
  function_name    = "${local.name_prefix}-customers-handler"
  role             = aws_iam_role.customers_handler.arn
  handler          = "app.lambda_handler"
  source_code_hash = fileexists("${path.module}/../dist/customers_handler.zip") ? filebase64sha256("${path.module}/../dist/customers_handler.zip") : ""
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      CUSTOMERS_TABLE = aws_dynamodb_table.customers.name
    }
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "customers_handler" {
  name              = "/aws/lambda/${aws_lambda_function.customers_handler.function_name}"
  retention_in_days = 7

  tags = local.common_tags
}
