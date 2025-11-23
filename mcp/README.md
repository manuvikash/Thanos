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
      "command": "python3",
      "args": ["-m", "mcp.server"],
      "cwd": "/absolute/path/to/thanos",
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

**Alternative (if module import doesn't work):**

```json
{
  "mcpServers": {
    "thanos": {
      "command": "python3",
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

### Server Initialization Errors

**Error: "failed to initialize server" or "failed to create streamable http client"**

This usually indicates one of the following:

1. **Missing Dependencies**: Ensure all Python packages are installed:
   ```bash
   cd mcp
   pip install -r requirements.txt
   ```

2. **Incorrect Python Path**: Make sure `python3` is in your PATH and points to Python 3.11+
   ```bash
   python3 --version  # Should be 3.11 or higher
   ```

3. **Import Errors**: If you see import errors, try running the server directly:
   ```bash
   cd /path/to/thanos/mcp
   python3 server.py
   ```
   If this works, the issue is with the Claude Desktop configuration.

4. **Transport Mismatch**: The server uses stdio transport. If you see errors about HTTP/SSE, ensure your Claude Desktop config uses the `command` and `args` format (not a URL).

### Authentication Errors

```
Error: Invalid Cognito credentials
```

- Verify THANOS_EMAIL and THANOS_PASSWORD are correct
- Ensure the user exists in the Cognito User Pool
- Check the password is set to permanent (not temporary)
- Verify the user is not in FORCE_CHANGE_PASSWORD state

### API Connection Errors

```
Error: API error: 401
```

- Verify THANOS_API_URL is correct (should end without trailing slash)
- Check User Pool ID and Client ID match your infrastructure
- Ensure API Gateway Cognito authorizer is configured correctly
- Verify the service account has proper permissions

### Missing Environment Variables

```
Error: Missing required environment variables
```

- All environment variables must be set in the MCP client config
- Use absolute paths for file references
- Check for typos in variable names (they are case-sensitive)
- Restart Claude Desktop after changing the config

### 404 Errors on Client Registration

If you see errors like "failed to register client: registration request failed with status 404":

- This usually means Claude Desktop is trying to use HTTP transport instead of stdio
- Verify your config uses `"command"` and `"args"` (stdio) not a URL (HTTP)
- Ensure the server script path is absolute and correct
- Check that Python can execute the script: `python3 /path/to/thanos/mcp/server.py`

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
