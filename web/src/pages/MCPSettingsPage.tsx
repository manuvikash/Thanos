import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { 
  Terminal, 
  Key, 
  Copy, 
  CheckCircle, 
  Trash2, 
  Plus,
  ExternalLink,
  AlertCircle,
  Wrench,
  Database,
  FileText,
  BarChart3,
  Search,
  Users,
  Settings,
  Shield,
  Download
} from 'lucide-react'
import { getMCPApiKeys, createMCPApiKey, revokeMCPApiKey, MCPApiKey } from '../api'

const MCP_KEYS_STORAGE_KEY = 'thanos_mcp_api_keys'

export default function MCPSettingsPage() {
  const [apiKeys, setApiKeys] = useState<MCPApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedConfig, setCopiedConfig] = useState<string | null>(null)
  const [mcpServerUrl, setMcpServerUrl] = useState('')

  useEffect(() => {
    loadApiKeys()
    fetchMcpServerUrl()
  }, [])

  const fetchMcpServerUrl = async () => {
    try {
      // Fetch from your config or Terraform outputs
      // For now, use environment variable or hardcoded
      const url = import.meta.env.VITE_MCP_SERVER_URL || 'https://your-mcp-server.execute-api.region.amazonaws.com/'
      setMcpServerUrl(url)
    } catch (error) {
      console.error('Failed to fetch MCP server URL:', error)
    }
  }

  // Helper to extract suffix from API key (consistent with backend)
  // Backend logic: if '_' in full_key: token_part[-8:] if len >= 8 else token_part
  //                else: full_key[-8:] if len >= 8 else full_key
  const extractKeySuffix = (apiKey: string): string => {
    // If it's already masked (***suffix), extract the suffix directly
    if (apiKey.includes('***')) {
      const suffix = apiKey.split('***')[1] || ''
      return suffix
    }
    // If it's a full key, match backend logic exactly
    if (apiKey.includes('_')) {
      const tokenPart = apiKey.split('_').pop() || ''
      // Last 8 chars if >= 8, else whole token part (matches Python [-8:] behavior)
      return tokenPart.length >= 8 ? tokenPart.slice(-8) : tokenPart
    }
    // No underscore: last 8 chars if >= 8, else whole key
    return apiKey.length >= 8 ? apiKey.slice(-8) : apiKey
  }

  const loadApiKeys = async () => {
    try {
      console.log('🔄 Loading API keys from backend...')
      const response = await getMCPApiKeys()
      console.log('✅ Backend response:', response)
      const backendKeys = response.keys || []
      
      console.log('📊 Loaded backend keys:', backendKeys.length, 'keys')
      backendKeys.forEach((key, i) => {
        console.log(`  Key ${i + 1}:`, {
          name: key.name,
          status: key.status,
          api_key: key.api_key,
          has_full_key: !!key.api_key_full
        })
      })
      
      // Store any full keys from backend response (first load or when keys are returned)
      try {
        const stored = localStorage.getItem(MCP_KEYS_STORAGE_KEY)
        const storedKeys: Record<string, string> = stored ? JSON.parse(stored) : {}
        
        // Save any api_key_full values from backend to localStorage
        let keysUpdated = false
        backendKeys.forEach(key => {
          if ((key as any).api_key_full) {
            const fullKey = (key as any).api_key_full
            let keySuffix = ''
            
            // Extract suffix using same logic as backend
            if (fullKey.includes('_')) {
              const tokenPart = fullKey.split('_').pop() || ''
              keySuffix = tokenPart.length >= 8 ? tokenPart.slice(-8) : tokenPart
            } else {
              keySuffix = fullKey.length >= 8 ? fullKey.slice(-8) : fullKey
            }
            
            // Store by suffix and name
            if (keySuffix && !storedKeys[keySuffix]) {
              storedKeys[keySuffix] = fullKey
              storedKeys[`name:${key.name}`] = fullKey
              keysUpdated = true
              console.log(`💾 Stored full key for "${key.name}" with suffix ${keySuffix}`)
            }
          }
        })
        
        if (keysUpdated) {
          localStorage.setItem(MCP_KEYS_STORAGE_KEY, JSON.stringify(storedKeys))
          console.log('✅ Updated localStorage with backend keys')
        }
        
        console.log('Stored keys from localStorage:', Object.keys(storedKeys).length, 'keys')
        
        if (Object.keys(storedKeys).length > 0) {
          console.log('Parsed stored keys:', Object.keys(storedKeys))
          
          // Match backend keys with stored full keys by suffix
          const enrichedKeys = backendKeys.map(key => {
            // Get suffix from backend key (prefer key_suffix field from backend)
            let keySuffix = ''
            if ((key as any).key_suffix) {
              keySuffix = String((key as any).key_suffix).trim()
            } else if ((key as any).key_id) {
              keySuffix = String((key as any).key_id).trim()
            } else {
              // Extract from masked key format: ***{suffix}
              keySuffix = extractKeySuffix(key.api_key).trim()
            }
            
            console.log(`🔍 Matching key "${key.name}":`, {
              backendApiKey: key.api_key,
              extractedSuffix: keySuffix,
              suffixLength: keySuffix.length,
              availableSuffixes: Object.keys(storedKeys),
              hasMatch: !!storedKeys[keySuffix]
            })
            
            // Try exact suffix match first
            if (keySuffix && storedKeys[keySuffix]) {
              console.log(`✅ Found full key for "${key.name}" with suffix ${keySuffix}`)
              return { 
                ...key, 
                api_key: storedKeys[keySuffix],
                api_key_full: storedKeys[keySuffix],
                key_suffix: keySuffix 
              }
            }
            
            // Try name-based match (fallback)
            const nameKey = `name:${key.name}`
            if (storedKeys[nameKey]) {
              console.log(`✅ Found full key for "${key.name}" by name: ${nameKey}`)
              return { 
                ...key, 
                api_key: storedKeys[nameKey],
                api_key_full: storedKeys[nameKey],
                key_suffix: keySuffix 
              }
            }
            
            // Try to find by matching end of stored keys (last resort)
            if (keySuffix) {
              for (const [storedKey, fullKey] of Object.entries(storedKeys)) {
                // Skip name-based keys in this loop
                if (storedKey.startsWith('name:')) continue
                
                if (fullKey.endsWith(keySuffix) || storedKey === keySuffix) {
                  console.log(`✅ Found full key for "${key.name}" by end matching: ${storedKey}`)
                  return { 
                    ...key, 
                    api_key: fullKey,
                    api_key_full: fullKey,
                    key_suffix: keySuffix 
                  }
                }
              }
            }
            
            console.warn(`⚠️ No stored key found for "${key.name}" with suffix "${keySuffix}"`)
            return key
          })
          
          console.log('Enriched keys:', enrichedKeys.map(k => ({ name: k.name, hasFullKey: !k.api_key.includes('***') })))
          setApiKeys(enrichedKeys)
        } else {
          console.log('No stored keys found in localStorage')
          // Even without localStorage, check if backend provided api_key_full
          const keysWithFullKeys = backendKeys.map(key => {
            if ((key as any).api_key_full) {
              return {
                ...key,
                api_key: (key as any).api_key_full,
                api_key_full: (key as any).api_key_full
              }
            }
            return key
          })
          setApiKeys(keysWithFullKeys)
        }
      } catch (error) {
        console.error('Failed to restore stored keys:', error)
        // Fallback: use api_key_full if available
        const keysWithFullKeys = backendKeys.map(key => {
          if ((key as any).api_key_full) {
            return {
              ...key,
              api_key: (key as any).api_key_full,
              api_key_full: (key as any).api_key_full
            }
          }
          return key
        })
        setApiKeys(keysWithFullKeys)
      }
    } catch (error) {
      console.error('Failed to load API keys:', error)
      setApiKeys([])
    } finally {
      setLoading(false)
    }
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      alert('Please enter a name for the API key')
      return
    }

    setCreating(true)
    try {
      const response = await createMCPApiKey({
        name: newKeyName,
        expires_days: 365
      })
      
      const fullApiKey = response.api_key
      setNewKey(fullApiKey)
      setNewKeyName('')
      
      // Extract key suffix for storage and state
      let keySuffix = ''
      if (fullApiKey.includes('_')) {
        const tokenPart = fullApiKey.split('_').pop() || ''
        // Get last 8 chars, or all if shorter (matching backend logic)
        keySuffix = tokenPart.length >= 8 ? tokenPart.slice(-8) : tokenPart
      } else {
        keySuffix = fullApiKey.length >= 8 ? fullApiKey.slice(-8) : fullApiKey
      }
      
      // Store the full API key in localStorage by suffix
      try {
        const stored = localStorage.getItem(MCP_KEYS_STORAGE_KEY)
        const storedKeys: Record<string, string> = stored ? JSON.parse(stored) : {}
        
        // Store by suffix (primary method)
        storedKeys[keySuffix] = fullApiKey
        // Also store by name as fallback
        storedKeys[`name:${response.name}`] = fullApiKey
        
        localStorage.setItem(MCP_KEYS_STORAGE_KEY, JSON.stringify(storedKeys))
        
        console.log(`✅ Stored API key:`, {
          name: response.name,
          suffix: keySuffix,
          suffixLength: keySuffix.length,
          fullKeyPrefix: fullApiKey.substring(0, 30) + '...',
          allStoredKeys: Object.keys(storedKeys).length
        })
      } catch (error) {
        console.error('❌ Failed to store API key:', error)
      }
      
      // Add the newly created key to the list immediately (with full key for internal use)
      const newKeyEntry: MCPApiKey = {
        api_key: fullApiKey, // Store full key in api_key field
        api_key_full: fullApiKey, // Also store in api_key_full for clarity
        key_suffix: keySuffix,
        key_id: keySuffix,
        name: response.name,
        created_at: response.created_at,
        expires_at: response.expires_at,
        last_used: null,
        status: 'active'
      }
      
      // Add to state immediately with full key
      setApiKeys(prev => [newKeyEntry, ...prev])
      
      // Don't reload from backend - the key is already in state with full value
      // Reloading causes the key to be replaced with masked version from backend
      console.log(`✅ Added new key "${response.name}" to state with full key`)
    } catch (error) {
      console.error('Failed to create API key:', error)
      alert('Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const revokeApiKey = async (keySuffix: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    try {
      await revokeMCPApiKey(keySuffix)
      await loadApiKeys()
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      alert('Failed to revoke API key')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  // Helper to get display version of API key (masked)
  const getDisplayKey = (apiKey: string | undefined): string => {
    if (!apiKey) {
      return 'thanos_mcp_***unknown'
    }
    if (apiKey.includes('***')) {
      return apiKey // Already masked
    }
    // Mask the key for display
    const keySuffix = apiKey.split('_').pop() || ''
    return `thanos_mcp_***${keySuffix}`
  }

  // Helper to get full key from display key
  const getFullKey = (displayKey: string | undefined): string => {
    if (!displayKey) {
      return ''
    }
    if (!displayKey.includes('***')) {
      return displayKey // Already full
    }
    // Try to find full key from localStorage by suffix
    try {
      const stored = localStorage.getItem(MCP_KEYS_STORAGE_KEY)
      if (stored) {
        const storedKeys: Record<string, string> = JSON.parse(stored)
        // Extract suffix from masked key: ***{suffix}
        const keySuffix = extractKeySuffix(displayKey)
        console.log(`Looking for full key with suffix: ${keySuffix}`, { storedSuffixes: Object.keys(storedKeys) })
        
        const fullKey = storedKeys[keySuffix]
        if (fullKey) {
          console.log(`✅ Found full key for suffix ${keySuffix}`)
          return fullKey
        }
        // Try to find by matching end of stored keys (fallback)
        for (const [suffix, fullKey] of Object.entries(storedKeys)) {
          if (fullKey.endsWith(keySuffix)) {
            console.log(`✅ Found full key by end matching: ${suffix}`)
            return fullKey
          }
        }
        console.warn(`⚠️ No full key found for suffix: ${keySuffix}`)
      }
    } catch (error) {
      console.error('Failed to get full key:', error)
    }
    return displayKey // Fallback to display key
  }

  const generateStdioWrapper = (apiKey: string | undefined): string => {
    if (!apiKey) {
      return '# Error: No API key provided'
    }
    const keyToUse = getFullKey(apiKey);
    if (!keyToUse) {
      return '# Error: Could not retrieve full API key'
    }
    return `#!/usr/bin/env python3
"""
Thanos MCP Stdio Wrapper
Connects stdio MCP clients (like Gemini CLI) to Thanos hosted server
"""

import sys
import json
from typing import Dict, Any, Optional

# Configuration
MCP_SERVER_URL = "${mcpServerUrl.replace(/\/$/, '')}"
API_KEY = "${keyToUse}"

HEADERS = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}


def log_error(msg: str):
    """Log to stderr for debugging"""
    print(f"[THANOS-MCP] {msg}", file=sys.stderr, flush=True)


def send_request(method: str, params: Optional[Dict[str, Any]] = None, msg_id: Any = None) -> Dict[str, Any]:
    """Send request to hosted MCP server"""
    try:
        import urllib.request
        import urllib.error
    except ImportError:
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32603,
                "message": "urllib not available - Python installation issue"
            },
            "id": msg_id
        }
    
    try:
        # For initialize, use GET /initialize endpoint (returns plain JSON, not JSON-RPC)
        if method == "initialize":
            url = f"{MCP_SERVER_URL}/initialize"
            log_error(f"GET {url}")
            req = urllib.request.Request(url, headers=HEADERS)
            
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
                log_error(f"Initialize OK")
                # Wrap plain response in JSON-RPC format
                return {
                    "jsonrpc": "2.0",
                    "result": result,
                    "id": msg_id
                }
        
        # For other methods, POST to /messages (expects and returns JSON-RPC)
        url = f"{MCP_SERVER_URL}/messages"
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": msg_id
        }
        
        log_error(f"POST {url} - method: {method}")
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers=HEADERS,
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            log_error(f"Response OK for {method}")
            # /messages already returns JSON-RPC format
            return result
            
    except urllib.error.HTTPError as e:
        try:
            error_body = e.read().decode('utf-8')
            log_error(f"HTTP {e.code}: {error_body}")
        except:
            error_body = str(e)
            log_error(f"HTTP {e.code}")
        
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32000,
                "message": f"HTTP {e.code}: {error_body}"
            },
            "id": msg_id
        }
    except urllib.error.URLError as e:
        log_error(f"Connection error: {str(e)}")
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32000,
                "message": f"Connection failed: {str(e)}"
            },
            "id": msg_id
        }
    except Exception as e:
        log_error(f"Request failed: {str(e)}")
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32603,
                "message": f"Internal error: {str(e)}"
            },
            "id": msg_id
        }


def main():
    """Main stdio loop - read from stdin, write to stdout"""
    # Unbuffer stdin and stdout for immediate I/O
    try:
        sys.stdin.reconfigure(line_buffering=True)
        sys.stdout.reconfigure(line_buffering=True)
    except AttributeError:
        # Python 2 or older Python 3 - already unbuffered or use different method
        pass
    
    log_error("Thanos MCP wrapper starting...")
    log_error(f"Server URL: {MCP_SERVER_URL}")
    log_error(f"API Key: {API_KEY[:20]}...")
    log_error("Ready to receive requests...")
    
    try:
        # Read JSON-RPC requests line-by-line from stdin
        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    log_error("stdin EOF - connection closed by client")
                    break
                
                line = line.strip()
                if not line:
                    log_error("Empty line received, skipping")
                    continue
                
                log_error(f"Received line: {line[:100]}...")
                request = json.loads(line)
                method = request.get("method")
                params = request.get("params")
                msg_id = request.get("id")
                
                log_error(f"Request: {method} (id={msg_id})")
                
                # Forward request to hosted server
                response = send_request(method, params, msg_id)
                
                # Write JSON-RPC response to stdout
                print(json.dumps(response), flush=True)
                log_error(f"Response sent for {method}")
                
            except json.JSONDecodeError as e:
                log_error(f"JSON decode error: {e}")
                error_response = {
                    "jsonrpc": "2.0",
                    "error": {
                        "code": -32700,
                        "message": f"Parse error: {str(e)}"
                    },
                    "id": None
                }
                print(json.dumps(error_response), flush=True)
                
            except Exception as e:
                log_error(f"Error processing request: {e}")
                error_response = {
                    "jsonrpc": "2.0",
                    "error": {
                        "code": -32603,
                        "message": f"Internal error: {str(e)}"
                    },
                    "id": request.get("id") if 'request' in locals() else None
                }
                print(json.dumps(error_response), flush=True)
    
    except KeyboardInterrupt:
        log_error("Interrupted by user")
    except Exception as e:
        log_error(f"Fatal error: {e}")
    finally:
        log_error("Wrapper shutting down")


if __name__ == "__main__":
    main()
`;
  }

  const generateConfigForKey = (apiKey: string | undefined) => {
    if (!apiKey) {
      return '{}'
    }
    // For masked keys, we can't generate a working config
    // But we can show the template with a placeholder
    try {
      // Always use full key for config generation
      const keyToUse = getFullKey(apiKey);
      if (!keyToUse) {
        return '{}'
      }
      return `{
  "mcpServers": {
    "thanos": {
      "url": "${mcpServerUrl}",
      "headers": {
        "x-api-key": "${keyToUse}"
      }
    }
  }
}`;
    } catch (error) {
      console.error('Error generating config:', error);
      return '{}';
    }
  }

  const copyConfigForKey = (apiKey: string) => {
    const config = generateConfigForKey(apiKey)
    navigator.clipboard.writeText(config)
    setCopiedConfig(apiKey)
    setTimeout(() => setCopiedConfig(null), 2000)
  }

  const downloadStdioWrapper = (apiKey: string) => {
    const script = generateStdioWrapper(apiKey)
    const blob = new Blob([script], { type: 'text/x-python' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'thanos-mcp-stdio.py'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const claudeConfigTemplate = `{
  "mcpServers": {
    "thanos": {
      "url": "${mcpServerUrl}",
      "headers": {
        "x-api-key": "YOUR_API_KEY_HERE"
      }
    }
  }
}`

  const geminiConfigTemplate = (wrapperPath: string) => `{
  "mcpServers": {
    "thanos": {
      "command": "python3",
      "args": ["${wrapperPath}"]
    }
  }
}`

  const tools = [
    {
      name: 'list_resources',
      icon: Database,
      category: 'Resources',
      description: 'List all resources for a customer with optional filtering by resource type, compliance status, or region',
      parameters: ['tenant_id (required)', 'resource_type (optional)', 'compliance_status (optional)', 'region (optional)', 'limit (optional)'],
      example: '"Show me all S3 buckets for demo-customer"'
    },
    {
      name: 'get_resource_details',
      icon: FileText,
      category: 'Resources',
      description: 'Get detailed configuration and compliance status for a specific resource',
      parameters: ['tenant_id (required)', 'resource_arn (required)'],
      example: '"Get details for resource arn:aws:s3:::my-bucket"'
    },
    {
      name: 'list_findings',
      icon: AlertCircle,
      category: 'Findings',
      description: 'List security and compliance findings with filtering by severity, resource type, or rule',
      parameters: ['tenant_id (required)', 'severity (optional)', 'resource_type (optional)', 'rule_id (optional)', 'limit (optional)'],
      example: '"Show me all critical findings for prod-customer"'
    },
    {
      name: 'get_finding_details',
      icon: Search,
      category: 'Findings',
      description: 'Get detailed information about a specific finding including observed vs expected configuration',
      parameters: ['tenant_id (required)', 'finding_id (required)'],
      example: '"Get details for finding f-abc123"'
    },
    {
      name: 'get_dashboard_metrics',
      icon: BarChart3,
      category: 'Metrics',
      description: 'Get aggregated dashboard metrics including compliance percentages, severity counts, and trends',
      parameters: ['tenant_id (required)'],
      example: '"Show me the dashboard metrics for demo-customer"'
    },
    {
      name: 'list_customers',
      icon: Users,
      category: 'Customers',
      description: 'List all registered customers with their configuration and status',
      parameters: [],
      example: '"List all customers"'
    },
    {
      name: 'get_customer_details',
      icon: Users,
      category: 'Customers',
      description: 'Get detailed information about a specific customer including AWS account, role ARN, and regions',
      parameters: ['tenant_id (required)'],
      example: '"Get details for customer demo-customer"'
    },
    {
      name: 'list_base_configs',
      icon: Settings,
      category: 'Configuration',
      description: 'List base configuration templates for different resource types',
      parameters: ['resource_type (optional)'],
      example: '"Show me base configs for S3 buckets"'
    },
    {
      name: 'get_compliance_summary',
      icon: Shield,
      category: 'Metrics',
      description: 'Get compliance summary across all resources showing compliant, non-compliant, and not evaluated counts',
      parameters: ['tenant_id (required)'],
      example: '"What is the compliance summary for prod-customer?"'
    }
  ]

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">MCP Integration</h1>
        <p className="text-muted-foreground">
          Connect AI assistants to your infrastructure using the Model Context Protocol
        </p>
      </div>

      {/* New API Key Alert */}
      {newKey && (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="ml-2">
            <div className="space-y-2">
              <p className="font-semibold text-green-900 dark:text-green-100">API Key Created Successfully!</p>
              <p className="text-sm text-green-800 dark:text-green-200">
                Save this key now - it will not be shown again.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 bg-white dark:bg-gray-900 px-3 py-2 rounded border text-sm font-mono break-all text-gray-900 dark:text-gray-100">
                  {newKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newKey)}
                  className="flex-shrink-0"
                >
                  {copiedKey ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewKey(null)}
                className="mt-2"
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="setup" className="gap-2">
            <Terminal className="h-4 w-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Wrench className="h-4 w-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Client</CardTitle>
              <CardDescription>
                Select your MCP client for setup instructions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="claude" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="claude">Claude Desktop</TabsTrigger>
                  <TabsTrigger value="gemini">Gemini CLI</TabsTrigger>
                </TabsList>

                {/* Claude Desktop Setup */}
                <TabsContent value="claude" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                      <div className="h-12 w-12 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xl font-bold mb-3">
                        1
                      </div>
                      <h3 className="font-semibold mb-2">Create API Key</h3>
                      <p className="text-sm text-muted-foreground">
                        Generate your key in the API Keys tab
                      </p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                      <div className="h-12 w-12 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xl font-bold mb-3">
                        2
                      </div>
                      <h3 className="font-semibold mb-2">Add to Claude</h3>
                      <p className="text-sm text-muted-foreground">
                        Copy the config below to your Claude settings
                      </p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                      <div className="h-12 w-12 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold mb-3">
                        ✓
                      </div>
                      <h3 className="font-semibold mb-2">Start Using</h3>
                      <p className="text-sm text-muted-foreground">
                        Restart Claude and try the tools
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Claude Desktop Configuration</Label>
                    <div className="bg-[#0C0C0C] rounded-lg overflow-hidden border border-border">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
                        <span className="text-xs font-mono text-muted-foreground">claude_desktop_config.json</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(claudeConfigTemplate)}
                          className="h-7 text-xs"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <pre className="p-4 text-sm font-mono overflow-x-auto">
                        <code className="text-gray-300">{claudeConfigTemplate}</code>
                      </pre>
                    </div>
                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <p><strong>Config file locations:</strong></p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="bg-muted p-3 rounded">
                          <strong className="block mb-1">macOS</strong>
                          <code className="text-[10px]">~/Library/Application Support/Claude/</code>
                        </div>
                        <div className="bg-muted p-3 rounded">
                          <strong className="block mb-1">Windows</strong>
                          <code className="text-[10px]">%APPDATA%/Claude/</code>
                        </div>
                        <div className="bg-muted p-3 rounded">
                          <strong className="block mb-1">Linux</strong>
                          <code className="text-[10px]">~/.config/Claude/</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Replace <code className="bg-muted px-1 rounded">YOUR_API_KEY_HERE</code> with your actual API key from the API Keys tab.
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                {/* Gemini CLI Setup */}
                <TabsContent value="gemini" className="space-y-6">
                  <Alert className="bg-blue-500/10 border-blue-500/20">
                    <Terminal className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-blue-700 dark:text-blue-400">
                      Gemini CLI requires a stdio wrapper to connect to our hosted server. <strong>Your API key will be embedded in the downloaded script</strong> - no need to configure it separately.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                      <div className="h-12 w-12 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xl font-bold mb-3">
                        1
                      </div>
                      <h3 className="font-semibold mb-2">Download Wrapper</h3>
                      <p className="text-sm text-muted-foreground">
                        Get the Python stdio wrapper with your API key
                      </p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                      <div className="h-12 w-12 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xl font-bold mb-3">
                        2
                      </div>
                      <h3 className="font-semibold mb-2">Update Config</h3>
                      <p className="text-sm text-muted-foreground">
                        Add the config to your Gemini settings
                      </p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                      <div className="h-12 w-12 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold mb-3">
                        ✓
                      </div>
                      <h3 className="font-semibold mb-2">Start Using</h3>
                      <p className="text-sm text-muted-foreground">
                        Restart Gemini CLI and try the tools
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Download Wrapper Script</Label>
                    {loading ? (
                      <div className="p-8 border rounded-lg bg-muted/30 text-center">
                        <p className="text-muted-foreground">Loading API keys...</p>
                      </div>
                    ) : apiKeys.filter(key => key.status === 'active').length > 0 ? (
                      <div className="space-y-3">
                        {apiKeys.filter(key => key.status === 'active').map((key) => {
                          // Try to get the full key from multiple possible fields
                          const keyValue = key.api_key_full || key.api_key || key.key_id || '';
                          const displayKey = getDisplayKey(keyValue);
                          
                          return (
                            <div key={key.key_id || Math.random()} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                              <div>
                                <p className="font-medium">{key.name || 'Unnamed Key'}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Key: {displayKey}
                                </p>
                              </div>
                              <Button
                                onClick={() => downloadStdioWrapper(keyValue)}
                                className="bg-cyan-500 hover:bg-cyan-600"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download Script
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 border rounded-lg bg-muted/30 text-center">
                        <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground mb-4">No active API keys found</p>
                        <p className="text-sm text-muted-foreground mb-4">Create an API key in the "API Keys" tab first</p>
                        <Button variant="outline" onClick={() => {
                          const tabsList = document.querySelector('[role="tablist"]');
                          const keysTab = tabsList?.querySelector('[value="keys"]') as HTMLElement;
                          keysTab?.click();
                        }}>
                          Go to API Keys
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Gemini CLI Configuration</Label>
                    <div className="bg-[#0C0C0C] rounded-lg overflow-hidden border border-border">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
                        <span className="text-xs font-mono text-muted-foreground">config.json</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(geminiConfigTemplate('~/thanos-mcp-stdio.py'))}
                          className="h-7 text-xs"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <pre className="p-4 text-sm font-mono overflow-x-auto">
                        <code className="text-gray-300">{geminiConfigTemplate('~/thanos-mcp-stdio.py')}</code>
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <p className="font-medium">Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>Download the wrapper script using the button above</li>
                      <li>Make it executable: <code className="bg-muted px-1 rounded">chmod +x thanos-mcp-stdio.py</code></li>
                      <li>Move to desired location (e.g., home directory)</li>
                      <li>Update the path in the config above to match your location</li>
                      <li>Add the config to your Gemini CLI settings</li>
                      <li>Restart Gemini CLI</li>
                    </ol>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      The downloaded script contains your API key. Keep it secure and don't share it.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>

              <div>
                <Label className="text-sm font-medium mb-2 block">Server URL</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                    {mcpServerUrl || 'Loading...'}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(mcpServerUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Tools</CardTitle>
              <CardDescription>
                {tools.length} tools available for querying your infrastructure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {['Resources', 'Findings', 'Metrics', 'Customers', 'Configuration'].map((category) => {
                  const categoryTools = tools.filter(t => t.category === category)
                  if (categoryTools.length === 0) return null

                  return (
                    <div key={category}>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Badge variant="secondary">{category}</Badge>
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {categoryTools.map((tool) => {
                          const Icon = tool.icon
                          return (
                            <Card key={tool.name} className="hover:border-cyan-500/50 transition-colors">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-cyan-500" />
                                  <code className="text-sm">{tool.name}</code>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                  {tool.description}
                                </p>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Parameters:</Label>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {tool.parameters.map((param) => (
                                      <Badge key={param} variant="outline" className="text-xs font-mono">
                                        {param}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="pt-2 border-t">
                                  <Label className="text-xs text-muted-foreground">Example:</Label>
                                  <p className="mt-1 text-xs italic text-foreground/80">
                                    {tool.example}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create API Key Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create API Key
                </CardTitle>
                <CardDescription>
                  Generate a new API key for authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Claude Desktop - Work Laptop"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createApiKey()}
                  />
                </div>
                <Button
                  onClick={createApiKey}
                  disabled={creating || !newKeyName.trim()}
                  className="w-full"
                >
                  {creating ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate API Key
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>Your MCP integration status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-cyan-500">{apiKeys.length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Active Keys</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-green-500">{tools.length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Available Tools</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Server Online</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Keys List */}
          <Card>
            <CardHeader>
              <CardTitle>Your API Keys</CardTitle>
              <CardDescription>
                Manage your MCP API keys. Keys expire after 1 year.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No API keys yet</p>
                  <p className="text-sm">Create your first key to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <div
                      key={key.api_key}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold mb-1">{key.name}</div>
                        <div className="text-sm text-muted-foreground space-x-3 flex flex-wrap gap-y-1">
                          <span className="font-mono">{getDisplayKey(key.api_key)}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>Created {formatDate(key.created_at)}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>Expires {formatDate(key.expires_at)}</span>
                          {key.last_used && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span>Last used {formatDate(key.last_used)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyConfigForKey(key.api_key)}
                          className="flex items-center gap-1.5"
                        >
                          {copiedConfig === key.api_key ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Copy Config</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const displayKey = getDisplayKey(key.api_key)
                            const keySuffix = displayKey.split('***')[1] || displayKey.split('_').pop() || ''
                            revokeApiKey(keySuffix)
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Documentation Link */}
      <div className="mt-8 text-center">
        <a
          href="https://modelcontextprotocol.io/introduction"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
        >
          Learn more about the Model Context Protocol
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}
