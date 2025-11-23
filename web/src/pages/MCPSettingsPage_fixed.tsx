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
      const url = import.meta.env.VITE_MCP_SERVER_URL || 'https://your-mcp-server.execute-api.region.amazonaws.com/'
      setMcpServerUrl(url)
    } catch (error) {
      console.error('Failed to fetch MCP server URL:', error)
    }
  }


  const loadApiKeys = async () => {
    try {
      const response = await getMCPApiKeys()
      const backendKeys = response.keys || []
      
      console.log('📥 Loaded backend keys:', backendKeys.length)
      
      // Store full keys in localStorage on first load
      const storedKeys: Record<string, string> = {}
      const stored = localStorage.getItem(MCP_KEYS_STORAGE_KEY)
      if (stored) {
        try {
          Object.assign(storedKeys, JSON.parse(stored))
        } catch (e) {
          console.error('Failed to parse stored keys:', e)
        }
      }
      
      // Process keys: store full keys if available, enrich from localStorage otherwise
      const processedKeys = backendKeys.map(key => {
        const keySuffix = key.key_suffix || key.key_id || ''
        
        // If backend provides full key (api_key_full), store it
        if (key.api_key_full) {
          console.log(`✅ Storing full key for "${key.name}" with suffix ${keySuffix}`)
          storedKeys[keySuffix] = key.api_key_full
          // Return with full key for internal use
          return { ...key, api_key: key.api_key_full }
        }
        
        // Otherwise, try to restore from localStorage
        const fullKey = storedKeys[keySuffix]
        if (fullKey) {
          console.log(`✅ Restored full key for "${key.name}" from localStorage`)
          return { ...key, api_key: fullKey }
        }
        
        console.warn(`⚠️ No full key available for "${key.name}" (suffix: ${keySuffix})`)
        return key // Return with masked key
      })
      
      // Save updated localStorage
      localStorage.setItem(MCP_KEYS_STORAGE_KEY, JSON.stringify(storedKeys))
      
      setApiKeys(processedKeys)
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
      
      // Extract suffix using same logic as backend
      const keySuffix = fullApiKey.includes('_') 
        ? fullApiKey.split('_').pop()!.slice(-8)
        : fullApiKey.slice(-8)
      
      // Store in localStorage
      try {
        const stored = localStorage.getItem(MCP_KEYS_STORAGE_KEY)
        const storedKeys: Record<string, string> = stored ? JSON.parse(stored) : {}
        storedKeys[keySuffix] = fullApiKey
        localStorage.setItem(MCP_KEYS_STORAGE_KEY, JSON.stringify(storedKeys))
        console.log(`✅ Stored new API key with suffix ${keySuffix}`)
      } catch (error) {
        console.error('❌ Failed to store API key:', error)
      }
      
      // Add the new key to the state immediately
      // This ensures it shows up even if backend doesn't return api_key_full yet
      const newKeyEntry: MCPApiKey = {
        api_key: fullApiKey, // Store full key
        api_key_full: fullApiKey, // Also set api_key_full for consistency
        key_suffix: keySuffix,
        key_id: keySuffix,
        name: response.name,
        created_at: response.created_at,
        expires_at: response.expires_at,
        last_used: null,
        status: 'active'
      }
      
      // Add to beginning of list (newest first)
      setApiKeys(prev => [newKeyEntry, ...prev])
      
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
      
      // Remove from localStorage
      try {
        const stored = localStorage.getItem(MCP_KEYS_STORAGE_KEY)
        if (stored) {
          const storedKeys: Record<string, string> = JSON.parse(stored)
          delete storedKeys[keySuffix]
          localStorage.setItem(MCP_KEYS_STORAGE_KEY, JSON.stringify(storedKeys))
        }
      } catch (e) {
        console.error('Failed to remove from localStorage:', e)
      }
      
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

  const getDisplayKey = (apiKey: string): string => {
    if (apiKey.includes('***')) {
      return apiKey // Already masked
    }
    // Mask for display
    const suffix = apiKey.includes('_') ? apiKey.split('_').pop()!.slice(-8) : apiKey.slice(-8)
    return `thanos_mcp_***${suffix}`
  }

  const generateConfigForKey = (apiKey: string) => {
    // Use full key if available, otherwise show placeholder
    const keyToUse = apiKey.includes('***') ? 'YOUR_API_KEY_HERE' : apiKey
    
    return `{
  "mcpServers": {
    "thanos": {
      "url": "${mcpServerUrl}",
      "headers": {
        "x-api-key": "${keyToUse}"
      }
    }
  }
}`
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
                  {apiKeys.map((key) => {
                    const keySuffix = key.key_suffix || key.key_id || ''
                    const hasFullKey = !key.api_key.includes('***')
                    
                    return (
                      <div
                        key={keySuffix || key.api_key}
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
                          {!hasFullKey && (
                            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                              ⚠️ Full key not available - config will show placeholder
                            </div>
                          )}
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
                                <span className="hidden sm:inline">Config</span>
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokeApiKey(keySuffix)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
