# API Gateway HTTP API routes for MCP key management

# Lambda integration for MCP keys handler
resource "aws_apigatewayv2_integration" "mcp_keys" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"

  integration_uri        = aws_lambda_function.mcp_keys.invoke_arn
  integration_method     = "POST"  # AWS_PROXY uses POST for all methods
  payload_format_version = "2.0"
}

# POST /mcp/keys - Create API key
resource "aws_apigatewayv2_route" "mcp_keys_post" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /mcp/keys"
  target    = "integrations/${aws_apigatewayv2_integration.mcp_keys.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# GET /mcp/keys - List API keys
resource "aws_apigatewayv2_route" "mcp_keys_get" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /mcp/keys"
  target    = "integrations/${aws_apigatewayv2_integration.mcp_keys.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# DELETE /mcp/keys/{key_id} - Revoke API key
resource "aws_apigatewayv2_route" "mcp_keys_delete" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /mcp/keys/{key_id}"
  target    = "integrations/${aws_apigatewayv2_integration.mcp_keys.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Lambda integration for MCP server
resource "aws_apigatewayv2_integration" "mcp_server" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"

  integration_uri        = aws_lambda_function.mcp_server.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# POST /mcp/messages - MCP protocol messages
resource "aws_apigatewayv2_route" "mcp_messages" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /mcp/messages"
  target    = "integrations/${aws_apigatewayv2_integration.mcp_server.id}"

  authorization_type = "NONE"  # API key auth handled in Lambda
}

# GET /mcp/initialize - MCP initialization endpoint
resource "aws_apigatewayv2_route" "mcp_initialize" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /mcp/initialize"
  target    = "integrations/${aws_apigatewayv2_integration.mcp_server.id}"

  authorization_type = "NONE"  # API key auth handled in Lambda
}

# POST /mcp/initialize - MCP initialization endpoint (POST variant)
resource "aws_apigatewayv2_route" "mcp_initialize_post" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /mcp/initialize"
  target    = "integrations/${aws_apigatewayv2_integration.mcp_server.id}"

  authorization_type = "NONE"  # API key auth handled in Lambda
}

# POST /mcp/register - MCP client registration endpoint
resource "aws_apigatewayv2_route" "mcp_register" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /mcp/register"
  target    = "integrations/${aws_apigatewayv2_integration.mcp_server.id}"

  authorization_type = "NONE"  # API key auth handled in Lambda
}

# GET /mcp/register - MCP client registration endpoint (GET variant)
resource "aws_apigatewayv2_route" "mcp_register_get" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /mcp/register"
  target    = "integrations/${aws_apigatewayv2_integration.mcp_server.id}"

  authorization_type = "NONE"  # API key auth handled in Lambda
}

# GET /mcp/sse - SSE connection endpoint
resource "aws_apigatewayv2_route" "mcp_sse" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /mcp/sse"
  target    = "integrations/${aws_apigatewayv2_integration.mcp_server.id}"

  authorization_type = "NONE"  # API key auth handled in Lambda
}

output "mcp_api_endpoint" {
  value       = "${aws_apigatewayv2_api.main.api_endpoint}/mcp"
  description = "MCP API endpoint base URL"
}
