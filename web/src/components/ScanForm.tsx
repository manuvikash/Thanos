import { useState, FormEvent, useEffect } from 'react'
import { runScan, Finding, Customer } from '../api'
import CustomerSelector from './CustomerSelector'

interface ScanFormProps {
  onScanComplete: (findings: Finding[], stats: { resources: number; findings: number }, tenantId: string, snapshotKey: string) => void
  onLoadingChange: (loading: boolean) => void
}

const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-north-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'ca-central-1',
  'sa-east-1',
]

export default function ScanForm({ onScanComplete, onLoadingChange }: ScanFormProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [tenantId, setTenantId] = useState('')
  const [roleArn, setRoleArn] = useState('')
  const [accountId, setAccountId] = useState('')
  const [regions, setRegions] = useState('us-east-1')
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['us-east-1'])
  const [useDropdown, setUseDropdown] = useState(false)
  const [rulesSource, setRulesSource] = useState<'repo' | 's3'>('repo')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (selectedCustomer) {
      setTenantId(selectedCustomer.tenant_id)
      setRoleArn(selectedCustomer.role_arn)
      setAccountId(selectedCustomer.account_id)
      setRegions(selectedCustomer.regions.join(', '))
      setSelectedRegions(selectedCustomer.regions)
      setUseDropdown(true)
    }
  }, [selectedCustomer])

  const handleClearSelection = () => {
    setSelectedCustomer(null)
    setTenantId('')
    setRoleArn('')
    setAccountId('')
    setRegions('us-east-1')
    setSelectedRegions(['us-east-1'])
    setUseDropdown(false)
  }

  const handleRegionToggle = (region: string) => {
    setSelectedRegions(prev => {
      if (prev.includes(region)) {
        return prev.filter(r => r !== region)
      } else {
        return [...prev, region]
      }
    })
  }

  const toggleRegionMode = () => {
    if (!useDropdown) {
      // Switching to dropdown mode
      const regionList = regions.split(',').map(r => r.trim()).filter(r => r)
      setSelectedRegions(regionList.length > 0 ? regionList : ['us-east-1'])
    } else {
      // Switching to manual mode
      setRegions(selectedRegions.join(', '))
    }
    setUseDropdown(!useDropdown)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    onLoadingChange(true)

    try {
      const regionList = useDropdown 
        ? selectedRegions 
        : regions.split(',').map(r => r.trim()).filter(r => r)
      
      const response = await runScan({
        tenant_id: tenantId,
        role_arn: roleArn,
        account_id: accountId,
        regions: regionList,
        rules_source: rulesSource,
      })

      setSuccess(`Scan completed! Found ${response.totals.findings} findings across ${response.totals.resources} resources.`)
      onScanComplete(response.findings_sample, response.totals, tenantId, response.snapshot_key)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      onLoadingChange(false)
    }
  }

  const isCustomerSelected = selectedCustomer !== null

  return (
    <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 md:p-8 backdrop-blur-sm">
      <h2 className="text-2xl md:text-3xl font-bold text-neutral-100 mb-6 font-mono-custom">Run Scan</h2>
      
      <CustomerSelector 
        onCustomerSelect={setSelectedCustomer}
        selectedCustomer={selectedCustomer}
      />

      {isCustomerSelected && (
        <div className="mb-4">
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-sm text-cyan-400 hover:text-cyan-300 underline"
          >
            Clear Selection (Manual Entry)
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Tenant ID
          </label>
          <input
            type="text"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="w-full px-4 py-3 bg-[#0C1A1A] border border-neutral-700 rounded-md text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
            placeholder="customer-123"
            required
            readOnly={isCustomerSelected}
            disabled={isCustomerSelected}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Role ARN
          </label>
          <input
            type="text"
            value={roleArn}
            onChange={(e) => setRoleArn(e.target.value)}
            className="w-full px-4 py-3 bg-[#0C1A1A] border border-neutral-700 rounded-md text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
            placeholder="arn:aws:iam::123456789012:role/AuditRole"
            required
            readOnly={isCustomerSelected}
            disabled={isCustomerSelected}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Account ID
          </label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-4 py-3 bg-[#0C1A1A] border border-neutral-700 rounded-md text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
            placeholder="123456789012"
            required
            readOnly={isCustomerSelected}
            disabled={isCustomerSelected}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-neutral-300">
              Regions
            </label>
            {!isCustomerSelected && (
              <button
                type="button"
                onClick={toggleRegionMode}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline"
              >
                {useDropdown ? 'Switch to Manual Entry' : 'Switch to Dropdown'}
              </button>
            )}
          </div>
          
          {useDropdown ? (
            <div className="bg-[#0C1A1A] border border-neutral-700 rounded-md p-3 max-h-48 overflow-y-auto">
              {AWS_REGIONS.map(region => (
                <label key={region} className="flex items-center mb-2 cursor-pointer hover:bg-neutral-800 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedRegions.includes(region)}
                    onChange={() => handleRegionToggle(region)}
                    disabled={isCustomerSelected}
                    className="mr-2 h-4 w-4 text-cyan-500 focus:ring-cyan-500 border-neutral-600 rounded"
                  />
                  <span className="text-sm text-neutral-100">{region}</span>
                </label>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={regions}
              onChange={(e) => setRegions(e.target.value)}
              className="w-full px-4 py-3 bg-[#0C1A1A] border border-neutral-700 rounded-md text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
              placeholder="us-east-1, us-west-2"
              readOnly={isCustomerSelected}
              disabled={isCustomerSelected}
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Rules Source
          </label>
          <select
            value={rulesSource}
            onChange={(e) => setRulesSource(e.target.value as 'repo' | 's3')}
            className="w-full px-4 py-3 bg-[#0C1A1A] border border-neutral-700 rounded-md text-neutral-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
          >
            <option value="repo">Repository (default.rules.yaml)</option>
            <option value="s3">S3 Bucket</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-neutral-100 hover:bg-neutral-200 text-[#0C1A1A] font-mono-custom font-semibold py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0C1A1A]"
        >
          Run Scan
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-md text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-900/50 border border-green-700 rounded-md text-green-300 text-sm">
          {success}
        </div>
      )}
    </div>
  )
}
