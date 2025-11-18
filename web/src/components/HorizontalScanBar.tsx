import { useState, FormEvent, useEffect } from 'react'
import { runScan, Finding, Customer } from '../api'

interface HorizontalScanBarProps {
  onScanComplete: (
    findings: Finding[],
    stats: { resources: number; findings: number },
    tenantId: string,
    snapshotKey: string
  ) => void
  onLoadingChange: (loading: boolean) => void
  currentTenantId?: string
}

type ScanStatus = 'ready' | 'scanning' | 'complete' | 'error'

export default function HorizontalScanBar({
  onScanComplete,
  onLoadingChange,
  currentTenantId,
}: HorizontalScanBarProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [tenantId, setTenantId] = useState('')
  const [status, setStatus] = useState<ScanStatus>('ready')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loadingCustomers, setLoadingCustomers] = useState(true)

  // Load customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true)
      try {
        const { getCustomers } = await import('../api')
        const data = await getCustomers()
        setCustomers(data)
      } catch (err) {
        console.error('Failed to load customers:', err)
      } finally {
        setLoadingCustomers(false)
      }
    }
    fetchCustomers()
  }, [])

  // Sync with currentTenantId prop
  useEffect(() => {
    if (currentTenantId && currentTenantId !== tenantId) {
      setTenantId(currentTenantId)
      const customer = customers.find(c => c.tenant_id === currentTenantId)
      setSelectedCustomer(customer || null)
    }
  }, [currentTenantId, customers, tenantId])

  // Update form when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      setTenantId(selectedCustomer.tenant_id)
    }
  }, [selectedCustomer])

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTenantId = e.target.value
    if (selectedTenantId === '') {
      setSelectedCustomer(null)
      setTenantId('')
    } else {
      const customer = customers.find(c => c.tenant_id === selectedTenantId)
      if (customer) {
        setSelectedCustomer(customer)
        setTenantId(customer.tenant_id)
      }
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus('scanning')
    setProgress(0)
    onLoadingChange(true)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 300)

      const customer = selectedCustomer || customers.find(c => c.tenant_id === tenantId)
      
      if (!customer) {
        throw new Error('Please select a valid customer')
      }

      const response = await runScan({
        tenant_id: customer.tenant_id,
        role_arn: customer.role_arn,
        account_id: customer.account_id,
        regions: customer.regions,
        rules_source: 'repo',
      })

      clearInterval(progressInterval)
      setProgress(100)
      setStatus('complete')
      onScanComplete(response.findings_sample, response.totals, customer.tenant_id, response.snapshot_key)

      // Reset to ready after 3 seconds
      setTimeout(() => {
        setStatus('ready')
        setProgress(0)
      }, 3000)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Scan failed')
      setProgress(0)
    } finally {
      onLoadingChange(false)
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'ready':
        return 'Ready'
      case 'scanning':
        return 'Scanning...'
      case 'complete':
        return 'Complete'
      case 'error':
        return 'Error'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'ready':
        return 'text-neutral-400'
      case 'scanning':
        return 'text-cyan-400'
      case 'complete':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-[#0C1A1A] border-b border-neutral-800 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Left group: Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Tenant Dropdown */}
            <div className="flex-1 min-w-[200px] max-w-[300px]">
              <select
                value={tenantId}
                onChange={handleCustomerChange}
                disabled={loadingCustomers || status === 'scanning'}
                className="w-full h-11 px-3 bg-[#102020] border border-neutral-700 rounded-md text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                required
              >
                <option value="">
                  {loadingCustomers ? 'Loading...' : 'Select Customer'}
                </option>
                {customers.map(customer => (
                  <option key={customer.tenant_id} value={customer.tenant_id}>
                    {customer.customer_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Scan Button */}
            <button
              type="submit"
              disabled={!tenantId || status === 'scanning' || loadingCustomers}
              className="h-11 px-6 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0C1A1A] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[120px]"
            >
              {status === 'scanning' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Scanning
                </span>
              ) : (
                'Run Scan'
              )}
            </button>
          </div>

          {/* Right group: Status and Progress */}
          <div className="flex items-center gap-4 lg:border-l lg:border-neutral-700 lg:pl-4">
            {/* Status Indicator */}
            <div className="flex items-center gap-2 min-w-[100px]">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    status === 'ready'
                      ? 'bg-neutral-500'
                      : status === 'scanning'
                      ? 'bg-cyan-500 animate-pulse'
                      : status === 'complete'
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            {status === 'scanning' && (
              <div className="flex-1 min-w-[120px] max-w-[200px]">
                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && status === 'error' && (
          <div className="mt-3 px-3 py-2 bg-red-900/30 border border-red-700/50 rounded-md text-red-300 text-sm">
            {error}
          </div>
        )}
      </form>
    </div>
  )
}
