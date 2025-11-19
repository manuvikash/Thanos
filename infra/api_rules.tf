# Lambda integration for rules handler
resource "aws_apigatewayv2_integration" "rules" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"

  integration_uri        = aws_lambda_function.rules_handler.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# GET /rules - list all rules
resource "aws_apigatewayv2_route" "rules_list" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /rules"
  target    = "integrations/${aws_apigatewayv2_integration.rules.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# GET /rules/{rule_id} - get specific rule
resource "aws_apigatewayv2_route" "rules_get" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /rules/{rule_id}"
  target    = "integrations/${aws_apigatewayv2_integration.rules.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# POST /rules - create new rule
resource "aws_apigatewayv2_route" "rules_create" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /rules"
  target    = "integrations/${aws_apigatewayv2_integration.rules.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# PUT /rules/{rule_id} - update rule
resource "aws_apigatewayv2_route" "rules_update" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /rules/{rule_id}"
  target    = "integrations/${aws_apigatewayv2_integration.rules.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# DELETE /rules/{rule_id} - delete rule
resource "aws_apigatewayv2_route" "rules_delete" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /rules/{rule_id}"
  target    = "integrations/${aws_apigatewayv2_integration.rules.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Lambda permission for API Gateway to invoke rules handler
resource "aws_lambda_permission" "rules" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rules_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
