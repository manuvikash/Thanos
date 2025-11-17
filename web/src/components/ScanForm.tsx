import { useState, FormEvent, useEffect } from 'react'
import { runScan, Finding } from '../api'
import { getSavedTenants, saveTenant, deleteTenant, parseUrlParams, extractAccountIdFromArn, SavedTenant } from '../utils/storage'
import RegionSelector from './RegionSelector'
import TenantSelector from './TenantSelector'

interface ScanFormProps {
  onScanComplete: (findings: Finding[], stats: { resources: number; findings: number }, tenantId: string) => void
  onLoadingChange: (loading: boolean) => void
}

export default function ScanForm({ onScanComplete, onLoadingChange }: ScanFormProps) {
  const [tenantId, setTenantId] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [roleArn, setRoleArn] = useState('')
  const [accountId, setAccountId] = useState('')
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['us-east-1'])
  const [rulesSource, setRulesSource] = useState<'repo' | 's3'>('repo')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [savedTenants, setSavedTenants] = useState<SavedTenant[]>([])
  const [showImport, setShowImport] = useState(false)
  const [importJson, setImportJson] = useState('')

  // Load saved tenants and URL params on mount
  useEffect(() => {
    setSavedTenants(getSavedTenants())
    
    // Check for URL parameters
    const urlParams = parseUrlParams()
    if (urlParams) {
      if (urlParams.id) setTenantId(urlParams.id)
      if (urlParams.roleArn) setRoleArn(urlParams.roleArn)
      if (urlParams.accountId) setAccountId(urlParams.accountId)
      if (urlParams.regions) setSelectedRegions(urlParams.regions)
    }
  }, [])

  // Auto-extract account ID from Role ARN
  useEffect(() => {
    if (roleArn) {
      const extracted = extractAccountIdFromArn(roleArn)
      if (extracted && extracted !== accountId) {
        setAccountId(extracted)
      }
      
      // Auto-generate tenant ID if empty
      if (!tenantId && extracted) {
        setTenantId(`account-${extracted}`)
      }
    }
  }, [roleArn])

  const loadTenant = (tenant: SavedTenant) => {
    setTenantId(tenant.id)
    setTenantName(tenant.name)
    setRoleArn(tenant.roleArn)
    setAccountId(tenant.accountId)
    setSelectedRegions(tenant.regions)
    setRulesSource(tenant.rulesSource)
  }

  const handleDeleteTenant = (tenantIdToDelete: string) => {
    deleteTenant(tenantIdToDelete)
    setSavedTenants(getSavedTenants())
  }

  const handleQuickScan = async () => {
    // Quick scan with default CloudFormation role
    if (!accountId) {
      setError('Please enter Account ID for quick scan')
      return
    }

    if (selectedRegions.length === 0) {
      setError('Please select at least one region')
      return
    }

    const quickRoleArn = `arn:aws:iam::${accountId}:role/CloudGoldenGuardAuditRole`
    const quickTenantId = tenantId || `account-${accountId}`
    
    setRoleArn(quickRoleArn)
    setTenantId(quickTenantId)
    
    // Trigger scan
    await performScan(quickTenantId, quickRoleArn, accountId, selectedRegions, rulesSource)
  }

  const handleImport = () => {
    try {
      const data = JSON.parse(importJson)
      
      if (data.RoleArn) setRoleArn(data.RoleArn)
      if (data.AccountId) setAccountId(data.AccountId)
      
      const extractedAccountId = data.AccountId || extractAccountIdFromArn(data.RoleArn)
      if (extractedAccountId) {
        setAccountId(extractedAccountId)
        setTenantId(`account-${extractedAccountId}`)
      }
      
      setShowImport(false)
      setImportJson('')
      setSuccess('Configuration imported successfully!')
    } catch (err) {
      setError('Invalid JSON format')
    }
  }

  const performScan = async (
    tenant: string,
    role: string,
    account: string,
    regions: string[],
    rules: 'repo' | 's3'
  ) => {
    setError(null)
    setSuccess(null)
    onLoadingChange(true)

    try {
      const response = await runScan({
        tenant_id: tenant,
        role_arn: role,
        account_id: account,
        regions: regions,
        rules_source: rules,
      })

      // Save tenant configuration
      saveTenant({
        id: tenant,
        name: tenantName || tenant,
        roleArn: role,
        accountId: account,
        regions: regions,
        rulesSource: rules,
        lastUsed: new Date().toISOString(),
      })
      setSavedTenants(getSavedTenants())

      setSuccess(`Scan completed! Found ${response.totals.findings} findings across ${response.totals.resources} resources.`)
      onScanComplete(response.findings_sample, response.totals, tenant)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      onLoadingChange(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Validate regions
    if (selectedRegions.length === 0) {
      setError('Please select at least one region')
      return
    }
    
    await performScan(tenantId, roleArn, accountId, selectedRegions, rulesSource)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-blue-400 mb-1">Run Scan</h2>
        <p className="text-xs text-gray-400">
          Enter Role ARN · Account ID auto-extracts · Other fields optional
        </p>
      </div>
      
      {/* Saved Tenants */}
      <TenantSelector 
        tenants={savedTenants}
        onSelect={loadTenant}
        onDelete={handleDeleteTenant}
      />

      {/* Quick Actions */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={handleQuickScan}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 text-sm flex items-center justify-center gap-1"
        >
          <span>🚀</span>
          <span>Quick Scan</span>
        </button>
        <button
          type="button"
          onClick={() => setShowImport(!showImport)}
          className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition duration-200 text-sm flex items-center justify-center gap-1"
        >
          <span>📋</span>
          <span>Import</span>
        </button>
      </div>
      
      {/* Quick hint */}
      {savedTenants.length === 0 && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-md">
          <p className="text-xs text-blue-300">
            💡 <strong>First time?</strong> Enter Account ID → Click Quick Scan
          </p>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="mb-4 p-4 bg-gray-700 border border-gray-600 rounded-md">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Paste CloudFormation Output JSON
          </label>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 font-mono text-sm"
            rows={4}
            placeholder='{"RoleArn": "arn:aws:iam::...", "AccountId": "..."}'
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleImport}
              className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
            >
              Import
            </button>
            <button
              type="button"
              onClick={() => setShowImport(false)}
              className="px-4 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-md text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
            Role ARN <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={roleArn}
            onChange={(e) => setRoleArn(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="arn:aws:iam::123456789012:role/CloudGoldenGuardAuditRole"
            required
          />
          <p className="mt-1 text-xs text-gray-400">✨ Auto-extracts Account ID & Tenant ID</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              Account ID <span className="text-red-400">*</span>
              <span className="ml-auto text-xs text-blue-400">auto</span>
            </label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="123456789012"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              Tenant ID <span className="text-red-400">*</span>
              <span className="ml-auto text-xs text-blue-400">auto</span>
            </label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="account-123..."
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
            Tenant Name
            <span className="ml-auto text-xs text-gray-500">optional</span>
          </label>
          <input
            type="text"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="My Company"
          />
        </div>

        <RegionSelector 
          selectedRegions={selectedRegions}
          onChange={setSelectedRegions}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Rules Source
          </label>
          <select
            value={rulesSource}
            onChange={(e) => setRulesSource(e.target.value as 'repo' | 's3')}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="repo">Repository (default.rules.yaml)</option>
            <option value="s3">S3 Bucket</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Run Scan
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-900/50 border border-green-700 rounded-md text-green-200 text-sm">
          {success}
        </div>
      )}
    </div>
  )
}
