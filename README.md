# ⚡ Thanos

> *"Perfectly balanced, like all things should be."*

**Cloud security compliance that brings balance to your AWS infrastructure.**

Thanos is a serverless cloud security platform that scans AWS accounts for misconfigurations, tracks drift, and keeps your infrastructure perfectly compliant—without the chaos.

---

## 🎯 What It Does

Thanos continuously monitors your AWS infrastructure, detecting security misconfigurations and compliance violations in real-time:

- 🔍 **Automated Scanning** - Scans S3, IAM, Security Groups, VPCs, and more
- ⚠️ **Instant Findings** - Detects public buckets, overly permissive policies, open security groups
- 📊 **Compliance Metrics** - Track your security posture with severity-based dashboards
- 🤖 **AI-Ready** - MCP integration lets AI assistants query your infrastructure
- 🌍 **Multi-Tenant** - Manage multiple AWS accounts from a single dashboard
- ⚡ **Serverless** - Built on AWS Lambda, scales automatically, pay only for what you use

**Example Findings:**
```
❌ S3 bucket 'prod-data' allows public access
❌ IAM role 'AdminRole' grants wildcard (*) permissions  
❌ Security group sg-abc123 allows SSH from 0.0.0.0/0
✅ 847 resources scanned, 94% compliant
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Dashboard                          │
│          (Vite + TailwindCSS + shadcn/ui)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API Gateway (HTTP API v2)                     │
│                    Cognito JWT Authorizer                       │
└──────┬──────────────┬──────────────┬────────────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Scan Handler │ │Config Handler│ │ MCP Server   │
│   (Lambda)   │ │   (Lambda)   │ │   (Lambda)   │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                 │
       └────────────────┼─────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │         DynamoDB              │
        │  • findings                   │
        │  • resources                  │
        │  • rules                      │
        │  • customers                  │
        │  • config                     │
        └───────────────────────────────┘
```

**Tech Stack:**
- **Frontend**: React 18, Vite, TailwindCSS, shadcn/ui, TypeScript
- **Backend**: AWS Lambda (Python 3.12), API Gateway HTTP API v2
- **Database**: DynamoDB (NoSQL, serverless)
- **Auth**: Cognito User Pools with JWT
- **Storage**: S3 for scan metadata
- **AI Integration**: Model Context Protocol (MCP) server for Claude/Gemini
- **IaC**: Terraform for infrastructure deployment

---

## 🚀 Quick Start

### Prerequisites
```bash
terraform --version  # >= 1.0
python3 --version    # >= 3.12
node --version       # >= 18
aws configure        # AWS credentials configured
```

### 1. Deploy Infrastructure

```bash
# Clone and deploy
git clone https://github.com/manuvikash/thanos.git
cd thanos
make tf-init     # First time only
make tf-apply    # Deploy everything

# Get admin credentials
cd infra
terraform output -raw admin_temporary_password
```

**Default admin:** `admin@example.com` (password from terraform output)

### 2. Launch Dashboard

```bash
make web-dev
```

Dashboard available at `http://localhost:3001`

### 3. Register Your First AWS Account

1. Navigate to **Dashboard → Onboard Account**
2. Enter AWS credentials (Access Key ID, Secret, regions)
3. Click **Register & Scan**
4. View findings in real-time!

---

## 🤖 AI Integration (MCP)

Thanos includes a Model Context Protocol (MCP) server, letting AI assistants like Claude and Gemini query your infrastructure:

### Claude Desktop Setup

1. Generate API key in **Dashboard → MCP Integration**
2. Copy the SSE configuration
3. Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "thanos": {
      "url": "https://your-lambda-url.amazonaws.com",
      "headers": {
        "x-api-key": "thanos_mcp_your_key_here"
      }
    }
  }
}
```

### Gemini CLI Setup

1. Download the stdio wrapper script from **MCP Integration** page
2. Configure in Gemini:

```json
{
  "mcpServers": {
    "thanos": {
      "command": "python3",
      "args": ["/path/to/thanos-mcp-stdio.py"]
    }
  }
}
```

**Example AI Queries:**
- "Show me all critical security findings"
- "List S3 buckets with public access enabled"
- "What's the compliance rate for prod-customer?"
- "Find all security groups allowing SSH from the internet"

---

## 📋 Features

### Security Scanning
- **Resource Discovery**: Auto-discover S3 buckets, IAM roles, security groups, VPCs
- **Rule Engine**: 50+ built-in security rules, custom rule support
- **Drift Detection**: Track configuration changes over time
- **Severity Scoring**: CRITICAL, HIGH, MEDIUM, LOW severity levels

### Dashboard & Reporting
- **Real-time Metrics**: Compliance rates, findings by severity, trends
- **Finding Details**: Full resource context, remediation guidance
- **Timeline View**: Track findings discovered over time
- **Multi-tenant**: Manage multiple AWS accounts from one dashboard

### Developer Experience
- **REST API**: Full programmatic access via API Gateway
- **MCP Server**: AI assistant integration via Model Context Protocol
- **Webhooks**: SNS notifications for critical findings (coming soon)
- **CLI Tools**: Scan triggers, config management (coming soon)

---

## 🛠️ Development

### Project Structure

```
thanos/
├── infra/              # Terraform infrastructure
├── lambdas/            # Python Lambda functions
│   ├── scan_handler/
│   ├── findings_handler/
│   ├── mcp_server/
│   └── common/         # Shared libraries
├── web/                # React dashboard
└── Makefile            # Build automation
```

### Commands

```bash
# Infrastructure
make tf-plan          # Preview changes
make tf-apply         # Deploy changes
make tf-destroy       # Tear down everything

# Frontend
make web-dev          # Development server
make web-build        # Production build
```

### Adding Custom Rules

Rules are stored in DynamoDB and evaluated during scans. Add them via the **Configuration** page or directly in DynamoDB:

```python
{
  "rule_id": "S3_001",
  "name": "S3 Bucket Public Access",
  "severity": "CRITICAL",
  "resource_type": "AWS::S3::Bucket"
}
```

---

## 🔐 Security Considerations

- **IAM Permissions**: Scan user needs read-only permissions (`SecurityAudit` policy recommended)
- **Credential Storage**: AWS credentials encrypted in DynamoDB
- **API Authentication**: All endpoints protected by Cognito JWT
- **MCP API Keys**: Scoped per-user, revocable, time-limited
- **Audit Logs**: All API calls logged in CloudWatch

---

## 📚 Documentation

- [MCP Integration Guide](mcp/README.md) - AI assistant setup

---

## 🤝 Contributing

Contributions welcome! This project is under active development.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

> *"The hardest choices require the strongest wills."* - Make your cloud infrastructure secure, one scan at a time.

**Made with ⚡ by the Thanos team**
