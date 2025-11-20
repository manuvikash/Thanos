# Role and policy similar to your other lambdas (reuse module if you have one)
resource "aws_iam_role" "onboarding_lambda_role" {
  name               = "${var.project_prefix}-onboarding-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# Allow lambda to write to DynamoDB table and call sts:AssumeRole
resource "aws_iam_role_policy" "onboarding_inline" {
  role = aws_iam_role.onboarding_lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      { Effect = "Allow", Action = ["dynamodb:PutItem"], Resource = aws_dynamodb_table.customers.arn },
      { Effect = "Allow", Action = ["sts:AssumeRole"], Resource = "arn:aws:iam::*:role/CloudGoldenGuardAuditRole" },
      { Effect = "Allow", Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"], Resource = "*" }
    ]
  })
}

resource "aws_lambda_function" "onboarding" {
  function_name = "${var.project_prefix}-onboarding"
  role          = aws_iam_role.onboarding_lambda_role.arn
  handler       = "app.handler"
  runtime       = "python3.11"
  filename      = "${path.module}/../dist/onboarding_handler.zip"

  environment {
    variables = {
      ONBOARDING_TEMPLATE_S3_BUCKET = aws_s3_bucket.cfn_artifacts.bucket
      ONBOARDING_TEMPLATE_S3_KEY    = aws_s3_object.onboarding_role_template.key
      TRUSTED_ACCOUNT_ID            = data.aws_caller_identity.this.account_id
      CUSTOMERS_TABLE               = aws_dynamodb_table.customers.name
      ONBOARDING_ROLE_NAME          = "CloudGoldenGuardAuditRole"
    }
  }
}

# API routes (reusing your existing HTTP API)
resource "aws_apigatewayv2_integration" "onboarding" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.onboarding.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "onboarding_quick_create" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /onboarding/quick-create-url"
  target    = "integrations/${aws_apigatewayv2_integration.onboarding.id}"
}

resource "aws_apigatewayv2_route" "onboarding_verify" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /onboarding/verify"
  target    = "integrations/${aws_apigatewayv2_integration.onboarding.id}"
}

resource "aws_lambda_permission" "apigw_onboarding" {
  statement_id  = "AllowAPIGwInvokeOnboarding"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.onboarding.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

output "customers_table_name" { value = aws_dynamodb_table.customers.name }
