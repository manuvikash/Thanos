# IAM role for scan handler Lambda
resource "aws_iam_role" "scan_handler" {
  name = "${local.name_prefix}-scan-handler"
  
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

resource "aws_iam_role_policy" "scan_handler" {
  name = "scan-handler-policy"
  role = aws_iam_role.scan_handler.id
  
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
          "sts:AssumeRole"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = [
          "${aws_s3_bucket.snapshots.arn}/*",
          "${aws_s3_bucket.rules.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = aws_dynamodb_table.findings.arn
      }
    ]
  })
}

# Scan handler Lambda function
resource "aws_lambda_function" "scan_handler" {
  filename         = "${path.module}/../dist/scan_handler.zip"
  function_name    = "${local.name_prefix}-scan-handler"
  role            = aws_iam_role.scan_handler.arn
  handler         = "app.lambda_handler"
  source_code_hash = fileexists("${path.module}/../dist/scan_handler.zip") ? filebase64sha256("${path.module}/../dist/scan_handler.zip") : ""
  runtime         = "python3.11"
  timeout         = 300
  memory_size     = 512
  
  environment {
    variables = {
      SNAPSHOTS_BUCKET = aws_s3_bucket.snapshots.id
      RULES_BUCKET     = aws_s3_bucket.rules.id
      FINDINGS_TABLE   = aws_dynamodb_table.findings.name
    }
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "scan_handler" {
  name              = "/aws/lambda/${aws_lambda_function.scan_handler.function_name}"
  retention_in_days = 7
  
  tags = local.common_tags
}

# IAM role for findings handler Lambda
resource "aws_iam_role" "findings_handler" {
  name = "${local.name_prefix}-findings-handler"
  
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

resource "aws_iam_role_policy" "findings_handler" {
  name = "findings-handler-policy"
  role = aws_iam_role.findings_handler.id
  
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
          "dynamodb:GetItem"
        ]
        Resource = [
          aws_dynamodb_table.findings.arn,
          "${aws_dynamodb_table.findings.arn}/index/*"
        ]
      }
    ]
  })
}

# Findings handler Lambda function
resource "aws_lambda_function" "findings_handler" {
  filename         = "${path.module}/../dist/findings_handler.zip"
  function_name    = "${local.name_prefix}-findings-handler"
  role            = aws_iam_role.findings_handler.arn
  handler         = "app.lambda_handler"
  source_code_hash = fileexists("${path.module}/../dist/findings_handler.zip") ? filebase64sha256("${path.module}/../dist/findings_handler.zip") : ""
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 256
  
  environment {
    variables = {
      FINDINGS_TABLE = aws_dynamodb_table.findings.name
    }
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "findings_handler" {
  name              = "/aws/lambda/${aws_lambda_function.findings_handler.function_name}"
  retention_in_days = 7
  
  tags = local.common_tags
}
