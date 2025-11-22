# API Gateway integrations for Config Handler
resource "aws_apigatewayv2_integration" "config_handler" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.config_handler.invoke_arn
}

# Base Configs Routes
resource "aws_apigatewayv2_route" "base_configs_list" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /base-configs"
  target    = "integrations/${aws_apigatewayv2_integration.config_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "base_configs_create" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /base-configs"
  target    = "integrations/${aws_apigatewayv2_integration.config_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "base_configs_get" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /base-configs/{resource_type}"
  target    = "integrations/${aws_apigatewayv2_integration.config_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "base_configs_update" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /base-configs/{resource_type}"
  target    = "integrations/${aws_apigatewayv2_integration.config_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "base_configs_delete" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /base-configs/{resource_type}"
  target    = "integrations/${aws_apigatewayv2_integration.config_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

# Templates Routes
resource "aws_apigatewayv2_route" "templates_list" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /templates"
  target    = "integrations/${aws_apigatewayv2_integration.config_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "templates_create" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /templates"
  target    = "integrations/${aws_apigatewayv2_integration.config_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "templates_by_type" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /templates/resource-type/{resource_type}"
  target    = "integrations/${aws_apigatewayv2_integration.config_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "templates_get" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /templates/{template_id}"
  target    = "integrations/${aws_apigatewayv2_integration.config_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "templates_delete" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /templates/{template_id}"
  target    = "integrations/${aws_apigatewayv2_integration.config_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

# API Gateway integrations for Groups Handler
resource "aws_apigatewayv2_integration" "groups_handler" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.groups_handler.invoke_arn
}

# Resource Groups Routes
resource "aws_apigatewayv2_route" "groups_list" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /groups"
  target    = "integrations/${aws_apigatewayv2_integration.groups_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "groups_create" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /groups"
  target    = "integrations/${aws_apigatewayv2_integration.groups_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "groups_get" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /groups/{group_id}"
  target    = "integrations/${aws_apigatewayv2_integration.groups_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "groups_update" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /groups/{group_id}"
  target    = "integrations/${aws_apigatewayv2_integration.groups_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}

resource "aws_apigatewayv2_route" "groups_delete" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /groups/{group_id}"
  target    = "integrations/${aws_apigatewayv2_integration.groups_handler.id}"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
  authorization_type = "JWT"
}
