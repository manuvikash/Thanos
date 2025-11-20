# IAM role for init handler Lambda
resource "aws_iam_role" "init_handler" {
  name = "${local.name_prefix}-init-handler"

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

resource "aws_iam_role_policy" "init_handler" {
  name = "init-handler-policy"
  role = aws_iam_role.init_handler.id

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
        Resource = aws_dynamodb_table.rules.arn
      }
    ]
  })
}

# Init handler Lambda function
resource "aws_lambda_function" "init_handler" {
  filename         = "${path.module}/../dist/init_handler.zip"
  function_name    = "${local.name_prefix}-init-handler"
  role             = aws_iam_role.init_handler.arn
  handler          = "app.lambda_handler"
  source_code_hash = fileexists("${path.module}/../dist/init_handler.zip") ? filebase64sha256("${path.module}/../dist/init_handler.zip") : ""
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      RULES_TABLE = aws_dynamodb_table.rules.name
    }
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "init_handler" {
  name              = "/aws/lambda/${aws_lambda_function.init_handler.function_name}"
  retention_in_days = 7

  tags = local.common_tags
}

# Invoke init handler on first deployment (using local-exec)
resource "null_resource" "init_rules" {
  depends_on = [
    aws_lambda_function.init_handler,
    aws_dynamodb_table.rules
  ]

  triggers = {
    # Only run once per deployment
    lambda_function = aws_lambda_function.init_handler.id
    rules_table     = aws_dynamodb_table.rules.id
  }

  provisioner "local-exec" {
    when    = create
    command = <<EOF
      aws lambda invoke \
        --function-name ${aws_lambda_function.init_handler.function_name} \
        --region ${var.aws_region} \
        /tmp/init-response.json && \
      cat /tmp/init-response.json && \
      rm /tmp/init-response.json
    EOF
  }
}
