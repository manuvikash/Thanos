# API Gateway routes for customer management

# POST /customers/register (no authentication)
resource "aws_apigatewayv2_integration" "registration" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"

  integration_uri        = aws_lambda_function.registration_handler.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "register_customer" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /customers/register"
  target    = "integrations/${aws_apigatewayv2_integration.registration.id}"
}

# POST /customers/verify-and-register (no authentication)
resource "aws_apigatewayv2_route" "verify_and_register_customer" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /customers/verify-and-register"
  target    = "integrations/${aws_apigatewayv2_integration.registration.id}"
}

resource "aws_lambda_permission" "registration_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.registration_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# GET /customers (API key authentication required)
resource "aws_apigatewayv2_integration" "customers" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"

  integration_uri        = aws_lambda_function.customers_handler.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_customers" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /customers"
  target    = "integrations/${aws_apigatewayv2_integration.customers.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_lambda_permission" "customers_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.customers_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
