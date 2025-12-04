# API Gateway routes for alerts configuration

# GET /alerts/config
resource "aws_apigatewayv2_route" "get_alerts_config" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /alerts/config"
  target    = "integrations/${aws_apigatewayv2_integration.alerts_config.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# PUT /alerts/config
resource "aws_apigatewayv2_route" "put_alerts_config" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /alerts/config"
  target    = "integrations/${aws_apigatewayv2_integration.alerts_config.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# OPTIONS /alerts/config (CORS)
resource "aws_apigatewayv2_route" "options_alerts_config" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /alerts/config"
  target    = "integrations/${aws_apigatewayv2_integration.alerts_config.id}"
}

# Integration with Lambda
resource "aws_apigatewayv2_integration" "alerts_config" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.alerts_config_handler.invoke_arn

  payload_format_version = "2.0"
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "alerts_config_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alerts_config_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*/alerts/config"
}
