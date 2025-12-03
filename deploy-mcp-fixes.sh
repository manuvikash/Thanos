#!/bin/bash
set -e

echo "🔧 Deploying MCP Fixes..."
echo ""

# Check if we're in the right directory
if [ ! -f "Makefile" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Step 1: Replace frontend file
echo "📝 Step 1: Updating frontend MCP Settings page..."
if [ -f "web/src/pages/MCPSettingsPage_fixed.tsx" ]; then
    cp web/src/pages/MCPSettingsPage.tsx web/src/pages/MCPSettingsPage.tsx.backup
    mv web/src/pages/MCPSettingsPage_fixed.tsx web/src/pages/MCPSettingsPage.tsx
    echo "✅ Frontend file updated (backup created)"
else
    echo "⚠️  Fixed file not found, skipping frontend update"
fi

# Step 2: Package Lambda functions
echo ""
echo "📦 Step 2: Packaging Lambda functions..."
make package

# Step 3: Deploy infrastructure
echo ""
echo "🚀 Step 3: Deploying infrastructure with Terraform..."
cd infra
terraform apply -auto-approve

# Step 4: Get outputs
echo ""
echo "📋 Step 4: Getting deployment outputs..."
MCP_SERVER_URL=$(terraform output -raw mcp_server_url 2>/dev/null || echo "Not available")
API_ENDPOINT=$(terraform output -raw api_endpoint 2>/dev/null || echo "Not available")

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 MCP Server URL:"
echo "   $MCP_SERVER_URL"
echo ""
echo "📍 API Endpoint:"
echo "   $API_ENDPOINT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next Steps:"
echo "1. Build and deploy frontend:"
echo "   cd web && npm run build"
echo ""
echo "2. Create an API key in the frontend (MCP Settings page)"
echo ""
echo "3. Configure Claude Desktop with:"
echo "   {\"mcpServers\": {\"thanos\": {\"url\": \"$MCP_SERVER_URL\", \"headers\": {\"x-api-key\": \"YOUR_KEY\"}}}}"
echo ""
echo "4. Restart Claude Desktop and test!"
echo ""
echo "📖 See MCP_FIXES.md for detailed documentation"
echo ""
