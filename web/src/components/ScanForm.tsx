import { useState, FormEvent } from 'react'
import { runScan, Finding } from '../api'

interface ScanFormProps {
  onScanComplete: (findings: Finding[], stats: { resources: number; findings: number }, tenantId: string) => void
  onLoadingChange: (loading: boolean) => void
}

export default function ScanForm({ onScanComplete, onLoadingChange }: ScanFormProps) {
  const [tenantId, setTenantId] = useState('')
  const [roleArn, setRoleArn] = useState('')
  const [accountId, setAccountId] = useState('')
  const [regions, setRegions] = useState('us-east-1')
  const [rulesSource, setRulesSource] = useState<'repo' | 's3'>('repo')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    onLoadingChange(true)

    try {
      const regionList = regions.split(',').map(r => r.trim()).filter(r => r)
      
      const response = await runScan({
        tenant_id: tenantId,
        role_arn: roleArn,
        account_id: accountId,
        regions: regionList,
        rules_source: rulesSource,
      })

      setSuccess(`Scan completed! Found ${response.totals.findings} findings across ${response.totals.resources} resources.`)
      onScanComplete(response.findings_sample, response.totals, tenantId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      onLoadingChange(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-2xl font-semibold mb-4 text-blue-400">Run Scan</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Tenant ID
          </label>
          <input
            type="text"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="customer-123"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Role ARN
          </label>
          <input
            type="text"
            value={roleArn}
            onChange={(e) => setRoleArn(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="arn:aws:iam::123456789012:role/AuditRole"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Account ID
          </label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123456789012"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Regions (comma-separated)
          </label>
          <input
            type="text"
            value={regions}
            onChange={(e) => setRegions(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="us-east-1, us-west-2"
          />
        </div>

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
