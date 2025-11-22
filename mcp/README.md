# Thanos MCP Server

Model Context Protocol (MCP) integration for Thanos AWS compliance monitoring platform. This server allows AI assistants like Claude to query compliance status, investigate security findings, and trigger scans across AWS accounts.

## Features

The MCP server exposes the following tools to AI assistants:

- **list_resources** - Query AWS resources with compliance status, drift scores, and findings
- **get_findings** - Get detailed security violations and misconfigurations
- **get_dashboard_metrics** - Comprehensive metrics including scan history and trends
- **trigger_scan** - Initiate new compliance scans for customer accounts
- **list_customers** - List all registered customers/tenants
- **get_rules** - View compliance rules and security checks
- **search_violations** - Search for specific security violations (e.g., "public access", "wildcard")

## Installation

### 1. Install Dependencies

```bash
cd mcp
pip install -r requirements.txt
```

### 2. Set Up Service Account

Create a dedicated Cognito service account for the MCP server:

```bash
# Get your Cognito User Pool ID and Client ID from Terraform outputs
cd ../infra
terraform output cognito_user_pool_id
terraform output cognito_client_id

# Create service account
aws cognito-idp admin-create-user \
  --user-pool-id <your-pool-id> \
  --username mcp-service@yourdomain.com \
  --user-attributes Name=email,Value=mcp-service@yourdomain.com \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id <your-pool-id> \
  --username mcp-service@yourdomain.com \
  --password <strong-password> \
  --permanent
```

### 3. Configure Environment Variables

The MCP server requires the following environment variables:

```bash
export THANOS_API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com"
export THANOS_USER_POOL_ID="us-east-1_XXXXX"
export THANOS_CLIENT_ID="abc123def456"
export THANOS_EMAIL="mcp-service@yourdomain.com"
export THANOS_PASSWORD="your-secure-password"
```

Get these values from your Terraform outputs:

```bash
cd ../infra
terraform output api_url
terraform output cognito_user_pool_id
terraform output cognito_client_id
```

## Usage

### Claude Desktop Configuration

Add this to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "thanos": {
      "command": "python",
      "args": ["/absolute/path/to/thanos/mcp/server.py"],
      "env": {
        "THANOS_API_URL": "https://your-api-id.execute-api.us-east-1.amazonaws.com",
        "THANOS_USER_POOL_ID": "us-east-1_XXXXX",
        "THANOS_CLIENT_ID": "abc123def456",
        "THANOS_EMAIL": "mcp-service@yourdomain.com",
        "THANOS_PASSWORD": "your-secure-password"
      }
    }
  }
}
```

### Running Standalone

For testing or other MCP clients:

```bash
# Ensure environment variables are set
export THANOS_API_URL="..."
export THANOS_USER_POOL_ID="..."
export THANOS_CLIENT_ID="..."
export THANOS_EMAIL="..."
export THANOS_PASSWORD="..."

# Run the server
python server.py
```

## Example Queries

Once configured, you can ask Claude:

- "Show me all non-compliant S3 buckets for customer-prod"
- "What are the critical security findings for acme-corp?"
- "List all resources with drift score above 0.5"
- "Search for violations related to public access"
- "Trigger a scan for tenant xyz-staging in us-east-1 and eu-west-1"
- "What's the compliance rate trend over the last week?"
- "Show me all security groups allowing SSH from 0.0.0.0/0"

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌─────────────┐
│   Claude/AI  │────────▶│  MCP Server  │────────▶│ API Gateway │
│              │  Query  │  (Python)    │   JWT   │  + Cognito  │
└──────────────┘         └──────────────┘         └─────────────┘
                                │                         │
                                │                         ▼
                                │                  ┌──────────────┐
                                │                  │   Lambda     │
                                │                  │   Handlers   │
                                │                  └──────────────┘
                                │                         │
                                ▼                         ▼
                         ┌──────────────┐         ┌──────────────┐
                         │   Cognito    │         │   DynamoDB   │
                         │ Auth Manager │         │   + S3       │
                         └──────────────┘         └──────────────┘
```

### Authentication Flow

1. **Initial Auth**: MCP server authenticates with Cognito using USER_PASSWORD_AUTH
2. **Token Caching**: ID token, access token, and refresh token are cached in memory
3. **Auto-Refresh**: Tokens automatically refresh 5 minutes before expiry
4. **API Calls**: Each API request includes the ID token in the Authorization header
5. **JWT Validation**: API Gateway validates the token against Cognito

Tokens are never persisted to disk and expire after 1 hour (auto-refreshed).

## Security Considerations

- **Service Account**: Use a dedicated Cognito user (not admin account)
- **Least Privilege**: Service account should have read-only permissions by default
- **Credential Storage**: Store credentials securely in MCP client config
- **Token Lifecycle**: Tokens are only stored in memory, never persisted
- **Rate Limiting**: Consider API Gateway rate limits for production use
- **Audit Logging**: All API calls are logged in CloudWatch

## Troubleshooting

### Authentication Errors

```
Error: Invalid Cognito credentials
```

- Verify THANOS_EMAIL and THANOS_PASSWORD are correct
- Ensure the user exists in the Cognito User Pool
- Check the password is set to permanent (not temporary)

### API Connection Errors

```
Error: API error: 401
```

- Verify THANOS_API_URL is correct
- Check User Pool ID and Client ID match your infrastructure
- Ensure API Gateway Cognito authorizer is configured correctly

### Missing Environment Variables

```
KeyError: 'THANOS_API_URL'
```

- All environment variables must be set in the MCP client config
- Use absolute paths for file references

## Development

Run tests:

```bash
python -m pytest tests/
```

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## License

Same as parent Thanos project.
