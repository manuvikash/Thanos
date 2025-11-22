#!/bin/bash
# Setup script for Thanos MCP Server

set -e

echo "🔧 Thanos MCP Server Setup"
echo "=========================="
echo ""

# Check if running from mcp directory
if [ ! -f "server.py" ]; then
    echo "❌ Error: Please run this script from the mcp/ directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "✅ Dependencies installed"
echo ""

# Get Terraform outputs
echo "🔍 Fetching configuration from Terraform..."
cd ../infra

if [ ! -f "terraform.tfstate" ]; then
    echo "❌ Error: Terraform state not found. Please deploy infrastructure first."
    exit 1
fi

API_URL=$(terraform output -raw api_url 2>/dev/null || echo "")
USER_POOL_ID=$(terraform output -raw cognito_user_pool_id 2>/dev/null || echo "")
CLIENT_ID=$(terraform output -raw cognito_client_id 2>/dev/null || echo "")

cd ../mcp

if [ -z "$API_URL" ] || [ -z "$USER_POOL_ID" ] || [ -z "$CLIENT_ID" ]; then
    echo "❌ Error: Could not fetch Terraform outputs"
    exit 1
fi

echo ""
echo "📋 Configuration Values:"
echo "  API URL:       $API_URL"
echo "  User Pool ID:  $USER_POOL_ID"
echo "  Client ID:     $CLIENT_ID"
echo ""

# Prompt for service account details
read -p "Enter service account email (default: mcp-service@yourdomain.com): " EMAIL
EMAIL=${EMAIL:-mcp-service@yourdomain.com}

read -s -p "Enter service account password: " PASSWORD
echo ""

if [ -z "$PASSWORD" ]; then
    echo "❌ Error: Password cannot be empty"
    exit 1
fi

# Create service account in Cognito
echo ""
echo "👤 Creating Cognito service account..."

# Check if user exists
USER_EXISTS=$(aws cognito-idp admin-get-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" 2>/dev/null && echo "yes" || echo "no")

if [ "$USER_EXISTS" = "yes" ]; then
    echo "⚠️  User already exists, updating password..."
    aws cognito-idp admin-set-user-password \
        --user-pool-id "$USER_POOL_ID" \
        --username "$EMAIL" \
        --password "$PASSWORD" \
        --permanent
else
    echo "Creating new user..."
    aws cognito-idp admin-create-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$EMAIL" \
        --user-attributes Name=email,Value="$EMAIL" \
        --message-action SUPPRESS
    
    aws cognito-idp admin-set-user-password \
        --user-pool-id "$USER_POOL_ID" \
        --username "$EMAIL" \
        --password "$PASSWORD" \
        --permanent
fi

echo "✅ Service account configured"
echo ""

# Determine config file path based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CONFIG_DIR="$HOME/.config/Claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    CONFIG_DIR="$APPDATA/Claude"
else
    CONFIG_DIR=""
fi

# Generate config file content
WORKSPACE_PATH=$(cd .. && pwd)
MCP_PATH="$WORKSPACE_PATH/mcp/server.py"

CONFIG_CONTENT=$(cat <<EOF
{
  "mcpServers": {
    "thanos": {
      "command": "python",
      "args": ["$MCP_PATH"],
      "env": {
        "THANOS_API_URL": "$API_URL",
        "THANOS_USER_POOL_ID": "$USER_POOL_ID",
        "THANOS_CLIENT_ID": "$CLIENT_ID",
        "THANOS_EMAIL": "$EMAIL",
        "THANOS_PASSWORD": "$PASSWORD"
      }
    }
  }
}
EOF
)

# Save config locally
echo "$CONFIG_CONTENT" > config.local.json
echo "✅ Configuration saved to config.local.json"
echo ""

# Offer to install to Claude Desktop
if [ -n "$CONFIG_DIR" ]; then
    echo "📱 Claude Desktop Integration"
    read -p "Would you like to install this config to Claude Desktop? (y/n): " INSTALL_CLAUDE
    
    if [ "$INSTALL_CLAUDE" = "y" ] || [ "$INSTALL_CLAUDE" = "Y" ]; then
        mkdir -p "$CONFIG_DIR"
        CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
        
        if [ -f "$CONFIG_FILE" ]; then
            echo "⚠️  Existing config found. Creating backup..."
            cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        fi
        
        echo "$CONFIG_CONTENT" > "$CONFIG_FILE"
        echo "✅ Configuration installed to $CONFIG_FILE"
        echo ""
        echo "🔄 Please restart Claude Desktop for changes to take effect"
    fi
fi

echo ""
echo "✨ Setup Complete!"
echo ""
echo "You can now use these commands with Claude:"
echo "  • 'Show me all non-compliant S3 buckets for customer-prod'"
echo "  • 'What are the critical security findings?'"
echo "  • 'List all resources with high drift scores'"
echo "  • 'Trigger a scan for tenant xyz'"
echo ""
echo "For manual configuration, copy the contents of config.local.json"
echo "to your MCP client's configuration file."
echo ""
