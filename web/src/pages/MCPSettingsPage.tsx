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
  Shield
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
      const response = await getMCPApiKeys()
      const backendKeys = response.keys || []
      
      console.log('Loaded backend keys:', backendKeys)
      
      // Try to restore full keys from localStorage
      try {
        const stored = localStorage.getItem(MCP_KEYS_STORAGE_KEY)
        console.log('Stored keys from localStorage:', stored)
        
        if (stored) {
          const storedKeys: Record<string, string> = JSON.parse(stored)
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
              return { ...key, api_key: storedKeys[keySuffix] }
            }
            
            // Try name-based match (fallback)
            const nameKey = `name:${key.name}`
            if (storedKeys[nameKey]) {
              console.log(`✅ Found full key for "${key.name}" by name: ${nameKey}`)
              return { ...key, api_key: storedKeys[nameKey] }
            }
            
            // Try to find by matching end of stored keys (last resort)
            if (keySuffix) {
              for (const [storedKey, fullKey] of Object.entries(storedKeys)) {
                // Skip name-based keys in this loop
                if (storedKey.startsWith('name:')) continue
                
                if (fullKey.endsWith(keySuffix) || storedKey === keySuffix) {
                  console.log(`✅ Found full key for "${key.name}" by end matching: ${storedKey}`)
                  return { ...key, api_key: fullKey }
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
          setApiKeys(backendKeys)
        }
      } catch (error) {
        console.error('Failed to restore stored keys:', error)
        setApiKeys(backendKeys)
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
      
      // Store the full API key in localStorage by suffix
      // Use the same extraction logic as backend (last 8 chars of token part)
      try {
        let keySuffix = ''
        if (fullApiKey.includes('_')) {
          const tokenPart = fullApiKey.split('_').pop() || ''
          // Get last 8 chars, or all if shorter (matching backend logic)
          keySuffix = tokenPart.length >= 8 ? tokenPart.slice(-8) : tokenPart
        } else {
          keySuffix = fullApiKey.length >= 8 ? fullApiKey.slice(-8) : fullApiKey
        }
        
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
        api_key: fullApiKey, // Store full key internally (not masked)
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
  const getDisplayKey = (apiKey: string): string => {
    if (apiKey.includes('***')) {
      return apiKey // Already masked
    }
    // Mask the key for display
    const keySuffix = apiKey.split('_').pop() || ''
    return `thanos_mcp_***${keySuffix}`
  }

  // Helper to get full key from display key
  const getFullKey = (displayKey: string): string => {
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

  const generateConfigForKey = (apiKey: string) => {
    // For masked keys, we can't generate a working config
    // But we can show the template with a placeholder
    try {
      // Always use full key for config generation
      const keyToUse = getFullKey(apiKey);
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
              <CardTitle>Quick Setup</CardTitle>
              <CardDescription>
                Get connected in 3 simple steps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  Replace <code className="bg-muted px-1 rounded">YOUR_API_KEY_HERE</code> with your actual API key. Restart Claude Desktop after saving the config.
                </AlertDescription>
              </Alert>

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
