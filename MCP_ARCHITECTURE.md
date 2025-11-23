# MCP Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Machine                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Claude Desktop                         │  │
│  │                                                            │  │
│  │  Config: claude_desktop_config.json                       │  │
│  │  {                                                         │  │
│  │    "mcpServers": {                                        │  │
│  │      "thanos": {                                          │  │
│  │        "url": "https://lambda-url...",                   │  │
│  │        "headers": {"x-api-key": "thanos_mcp_..."}       │  │
│  │      }                                                     │  │
│  │    }                                                       │  │
│  │  }                                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              │ HTTP POST                         │
│                              │ x-api-key: thanos_mcp_...        │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                          AWS Cloud                               │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Lambda: MCP Server (server_hosted.py)          │    │
│  │                                                          │    │
│  │  1. Validate API key against DynamoDB                   │    │
│  │  2. Handle MCP protocol requests:                       │    │
│  │     - initialize                                         │    │
│  │     - tools/list                                         │    │
│  │     - tools/call                                         │    │
│  │     - resources/list                                     │    │
│  │  3. Call Thanos API Gateway for data                    │    │
│  │  4. Return MCP protocol responses                       │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              │ Validates                         │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         DynamoDB: thanos-mcp-keys                       │    │
│  │                                                          │    │
│  │  Primary Key: api_key                                   │    │
│  │  GSI: user-email-index                                  │    │
│  │                                                          │    │
│  │  Items:                                                  │    │
│  │  - api_key: "thanos_mcp_abc123..."                     │    │
│  │  - user_email: "user@example.com"                      │    │
│  │  - name: "Claude Desktop - MacBook"                    │    │
│  │  - created_at: 1234567890                              │    │
│  │  - expires_at: 1234567890                              │    │
│  │  - status: "active"                                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         API Gateway: Thanos API                         │    │
│  │                                                          │    │
│  │  Endpoints:                                              │    │
│  │  - POST /mcp/keys (create key)                         │    │
│  │  - GET /mcp/keys (list keys)                           │    │
│  │  - DELETE /mcp/keys/{id} (revoke key)                  │    │
│  │  - GET /customers                                       │    │
│  │  - GET /findings                                        │    │
│  │  - GET /resources                                       │    │
│  │  - POST /scan                                           │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              │ Cognito JWT Auth                  │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Lambda: MCP Keys Handler (app.py)              │    │
│  │                                                          │    │
│  │  - Create API keys                                      │    │
│  │  - List user's keys (with api_key_full on first load) │    │
│  │  - Revoke keys                                          │    │
│  │  - Validate keys                                        │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      User's Browser                              │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         React Frontend: MCP Settings Page              │    │
│  │                                                          │    │
│  │  1. User creates API key                                │    │
│  │  2. Backend returns full key (api_key_full)            │    │
│  │  3. Frontend stores in localStorage by suffix          │    │
│  │  4. Shows config template with full key                │    │
│  │  5. On reload, restores from localStorage              │    │
│  │                                                          │    │
│  │  localStorage:                                           │    │
│  │  {                                                       │    │
│  │    "thanos_mcp_api_keys": {                            │    │
│  │      "abc12345": "thanos_mcp_full_key_here...",       │    │
│  │      "def67890": "thanos_mcp_another_key..."          │    │
│  │    }                                                     │    │
│  │  }                                                       │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### API Key Creation Flow

```
User Browser                  API Gateway              Lambda              DynamoDB
     │                             │                      │                    │
     │ 1. POST /mcp/keys          │                      │                    │
     │ (with JWT token)           │                      │                    │
     ├───────────────────────────>│                      │                    │
     │                             │ 2. Validate JWT     │                    │
     │                             │    & invoke         │                    │
     │                             ├─────────────────────>│                    │
     │                             │                      │ 3. Generate key   │
     │                             │                      │    thanos_mcp_... │
     │                             │                      │                    │
     │                             │                      │ 4. Store key      │
     │                             │                      ├───────────────────>│
     │                             │                      │                    │
     │                             │ 5. Return response   │                    │
     │                             │    with api_key_full │                    │
     │                             │<─────────────────────┤                    │
     │ 6. Response with full key  │                      │                    │
     │<────────────────────────────┤                      │                    │
     │                             │                      │                    │
     │ 7. Store in localStorage   │                      │                    │
     │    by suffix               │                      │                    │
     │                             │                      │                    │
```

### MCP Server Authentication Flow

```
Claude Desktop              Lambda MCP Server         DynamoDB
     │                             │                      │
     │ 1. POST /initialize         │                      │
     │    x-api-key: thanos_mcp_...│                      │
     ├───────────────────────────>│                      │
     │                             │ 2. Extract API key   │
     │                             │    from header       │
     │                             │                      │
     │                             │ 3. Query by api_key  │
     │                             ├─────────────────────>│
     │                             │                      │
     │                             │ 4. Return key data   │
     │                             │<─────────────────────┤
     │                             │                      │
     │                             │ 5. Check:            │
     │                             │    - status=active   │
     │                             │    - not expired     │
     │                             │                      │
     │                             │ 6. Update last_used  │
     │                             ├─────────────────────>│
     │                             │                      │
     │ 7. Return MCP capabilities  │                      │
     │<────────────────────────────┤                      │
     │                             │                      │
```

## Data Flow

### Key Persistence Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    First Load (Key Creation)                 │
└─────────────────────────────────────────────────────────────┘

Backend                          Frontend
   │                                │
   │ 1. Create key                 │
   │    api_key: "thanos_mcp_..."  │
   │    api_key_full: "thanos_..." │
   │    key_suffix: "abc12345"     │
   ├──────────────────────────────>│
   │                                │ 2. Store in localStorage
   │                                │    {
   │                                │      "abc12345": "thanos_mcp_full..."
   │                                │    }
   │                                │
   │                                │ 3. Display full key
   │                                │    (one-time only)
   │                                │

┌─────────────────────────────────────────────────────────────┐
│                    Subsequent Loads (Page Reload)            │
└─────────────────────────────────────────────────────────────┘

Backend                          Frontend
   │                                │
   │ 1. List keys                  │
   │    api_key: "***abc12345"     │
   │    key_suffix: "abc12345"     │
   ├──────────────────────────────>│
   │                                │ 2. Match by suffix
   │                                │    localStorage["abc12345"]
   │                                │    = "thanos_mcp_full..."
   │                                │
   │                                │ 3. Restore full key
   │                                │    for config generation
   │                                │
```

## Two MCP Server Options

### Option 1: Hosted HTTP Server (RECOMMENDED) ✅

```
┌──────────────┐         HTTPS          ┌─────────────────┐
│              │    x-api-key header    │                 │
│   Claude     ├───────────────────────>│  Lambda MCP     │
│   Desktop    │                        │  Server         │
│              │<───────────────────────┤  (hosted)       │
└──────────────┘    MCP JSON-RPC        └─────────────────┘
                    responses
```

**Pros**:
- ✅ Simple API key auth
- ✅ No local process
- ✅ Serverless scaling
- ✅ Works with Claude Desktop

**Config**:
```json
{
  "mcpServers": {
    "thanos": {
      "url": "https://lambda-url...",
      "headers": {"x-api-key": "thanos_mcp_..."}
    }
  }
}
```

### Option 2: Local stdio Server (ADVANCED) ⚠️

```
┌──────────────┐         stdio          ┌─────────────────┐
│              │    stdin/stdout        │                 │
│   Claude     ├───────────────────────>│  Python MCP     │
│   Desktop    │                        │  Server         │
│              │<───────────────────────┤  (local)        │
└──────────────┘    MCP JSON-RPC        └─────────────────┘
                    responses                    │
                                                  │ HTTPS
                                                  │ Cognito JWT
                                                  ▼
                                         ┌─────────────────┐
                                         │  Thanos API     │
                                         │  Gateway        │
                                         └─────────────────┘
```

**Pros**:
- ✅ Full control
- ✅ Local debugging

**Cons**:
- ❌ Requires Cognito credentials
- ❌ Local process management
- ❌ More complex setup

**Config**:
```json
{
  "mcpServers": {
    "thanos": {
      "command": "python3",
      "args": ["/path/to/mcp/server.py"],
      "env": {
        "THANOS_API_URL": "https://api...",
        "THANOS_USER_POOL_ID": "us-east-1_XXX",
        "THANOS_CLIENT_ID": "abc123",
        "THANOS_EMAIL": "user@example.com",
        "THANOS_PASSWORD": "password"
      }
    }
  }
}
```

## Security Model

### API Key Security

```
┌─────────────────────────────────────────────────────────────┐
│                      Security Layers                         │
└─────────────────────────────────────────────────────────────┘

1. Generation
   └─> Cryptographically secure random (secrets.token_urlsafe)
   └─> Prefix: "thanos_mcp_" for identification
   └─> 32 bytes of entropy

2. Storage (Backend)
   └─> DynamoDB with encryption at rest
   └─> Primary key: full API key
   └─> GSI: user-email-index for user queries
   └─> TTL: expires_at field (1 year default)

3. Transmission
   └─> HTTPS only
   └─> Header-based (not URL parameter)
   └─> Never logged in plaintext

4. Storage (Frontend)
   └─> Browser localStorage (same-origin only)
   └─> Cleared on logout (TODO: implement)
   └─> Consider encryption (TODO: Web Crypto API)

5. Validation
   └─> Every request validates:
       - Key exists in DynamoDB
       - status = "active"
       - expires_at > now
   └─> Updates last_used timestamp

6. Revocation
   └─> Immediate deletion from DynamoDB
   └─> All subsequent requests fail
   └─> No grace period
```

## Troubleshooting Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│              MCP Not Working? Start Here                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Can you create   │
                    │ API keys in UI?  │
                    └──────────────────┘
                         │         │
                    Yes  │         │  No
                         │         │
                         ▼         ▼
              ┌──────────────┐  ┌──────────────────┐
              │ Do keys      │  │ Check:           │
              │ persist on   │  │ - Cognito auth   │
              │ reload?      │  │ - API Gateway    │
              └──────────────┘  │ - Lambda perms   │
                   │         │  └──────────────────┘
              Yes  │         │  No
                   │         │
                   ▼         ▼
        ┌──────────────┐  ┌──────────────────┐
        │ Can you copy │  │ Deploy backend   │
        │ config with  │  │ fixes:           │
        │ full key?    │  │ terraform apply  │
        └──────────────┘  └──────────────────┘
             │         │
        Yes  │         │  No
             │         │
             ▼         ▼
  ┌──────────────┐  ┌──────────────────┐
  │ Does curl    │  │ Create new key   │
  │ test work?   │  │ and copy         │
  │              │  │ immediately      │
  └──────────────┘  └──────────────────┘
       │         │
  Yes  │         │  No
       │         │
       ▼         ▼
┌──────────────┐  ┌──────────────────┐
│ Check Claude │  │ Check:           │
│ Desktop      │  │ - Lambda URL     │
│ config:      │  │ - API key valid  │
│ - Correct    │  │ - Not expired    │
│   URL?       │  │ - curl syntax    │
│ - Correct    │  └──────────────────┘
│   key?       │
│ - Restarted? │
└──────────────┘
       │
       ▼
┌──────────────┐
│ Should work! │
│ Test with:   │
│ "List all    │
│  customers"  │
└──────────────┘
```

## Summary

- **Hosted HTTP MCP Server** is the recommended approach
- **API keys** are managed through the frontend UI
- **Keys persist** via localStorage with backend support
- **Authentication** is simple: just add `x-api-key` header
- **Security** is multi-layered with encryption and validation
