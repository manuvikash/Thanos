# IAM role for rules handler Lambda
resource "aws_iam_role" "rules_handler" {
  name = "${local.name_prefix}-rules-handler"

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

resource "aws_iam_role_policy" "rules_handler" {
  name = "rules-handler-policy"
  role = aws_iam_role.rules_handler.id

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
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.rules.arn,
          "${aws_dynamodb_table.rules.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.rules.arn}/*"
      }
    ]
  })
}

# Rules handler Lambda function
resource "aws_lambda_function" "rules_handler" {
  filename         = "${path.module}/../dist/rules_handler.zip"
  function_name    = "${local.name_prefix}-rules-handler"
  role             = aws_iam_role.rules_handler.arn
  handler          = "app.lambda_handler"
  source_code_hash = fileexists("${path.module}/../dist/rules_handler.zip") ? filebase64sha256("${path.module}/../dist/rules_handler.zip") : ""
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      RULES_TABLE  = aws_dynamodb_table.rules.name
      RULES_BUCKET = aws_s3_bucket.rules.id
    }
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "rules_handler" {
  name              = "/aws/lambda/${aws_lambda_function.rules_handler.function_name}"
  retention_in_days = 7

  tags = local.common_tags
}
