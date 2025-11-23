import { FormEvent, useState, useEffect } from 'react'
import { Finding, getCustomers, Customer, runScan } from '../api'
import { Spinner } from './ui/spinner'

interface HorizontalScanBarProps {
  onScanComplete: (
    findings: Finding[],
    stats: { resources: number; findings: number },
    tenantId: string,
    snapshotKey: string
  ) => void
  onScanError: (error: string) => void
  onLoadingChange: (loading: boolean) => void
  currentTenantId?: string
  onReset: () => void
}

export default function HorizontalScanBar({
  onScanComplete,
  onScanError,
  onLoadingChange,
  onReset,
}: HorizontalScanBarProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [status, setStatus] = useState<'ready' | 'scanning' | 'complete' | 'error'>('ready')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [loadingCustomers, setLoadingCustomers] = useState(true)

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const customerList = await getCustomers()
        setCustomers(customerList)
      } catch (error) {
        console.error('Failed to load customers:', error)
      } finally {
        setLoadingCustomers(false)
      }
    }
    fetchCustomers()
  }, [])

  const executeScanAll = async () => {
    if (customers.length === 0) {
      setError('No customers available to scan')
      setStatus('error')
      onScanError('No customers available to scan')
      return
    }

    setStatus('scanning')
    setError('')
    onLoadingChange(true)

    const allFindings: Finding[] = []
    let totalResources = 0
    let totalFindings = 0
    let lastSnapshotKey = ''

    try {
      // Scan each customer sequentially
      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i]
        setProgress(`Scanning ${customer.customer_name} (${i + 1}/${customers.length})...`)

        try {
          const response = await runScan({
            tenant_id: customer.tenant_id,
            role_arn: customer.role_arn,
            account_id: customer.account_id,
            regions: customer.regions,
            rules_source: 'repo',
          })

          if (response.findings_sample) {
            allFindings.push(...response.findings_sample)
          }
          totalResources += response.totals.resources || 0
          totalFindings += response.totals.findings || 0
          lastSnapshotKey = response.snapshot_key

          // Report progress for each customer scan
          if (i === customers.length - 1) {
            // Last scan - report all findings
            // Use first customer's tenant_id for dashboard metrics compatibility
            onScanComplete(
              allFindings,
              { resources: totalResources, findings: totalFindings },
              customers[0].tenant_id,
              lastSnapshotKey
            )
          }
        } catch (error) {
          console.error(`Failed to scan ${customer.customer_name}:`, error)
          // Continue with other customers even if one fails
        }
      }

      setStatus('complete')
      setProgress('All scans complete')
    } catch (error) {
      setStatus('error')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      onScanError(errorMessage)
    } finally {
      onLoadingChange(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await executeScanAll()
  }

  const handleResetClick = () => {
    setStatus('ready')
    setProgress('')
    setError('')
    onReset()
  }

  const getStatusText = () => {
    if (progress) return progress
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
        return 'text-green-500'
      case 'scanning':
        return 'text-primary'
      case 'complete':
        return 'text-green-500'
      case 'error':
        return 'text-destructive'
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-background border-b backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Left group: Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Info Display */}
            <div className="flex-1 min-w-[200px] max-w-[300px] px-3 h-11 flex items-center bg-muted rounded-md text-sm text-muted-foreground">
              {loadingCustomers ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Loading customers...
                </span>
              ) : (
                <span>{customers.length} customer{customers.length !== 1 ? 's' : ''} registered</span>
              )}
            </div>

            {/* Scan All Button */}
            <button
              type="submit"
              disabled={customers.length === 0 || status === 'scanning' || loadingCustomers}
              className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[140px]"
            >
              {status === 'scanning' ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Scanning
                </span>
              ) : (
                'Scan All Customers'
              )}
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetClick}
              disabled={status === 'scanning'}
              className="h-11 px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              title="Reset selection"
            >
              Reset
            </button>
          </div>

          {/* Right group: Status and Progress */}
          <div className="flex items-center gap-4 lg:border-l lg:border-border lg:pl-4">
            {/* Status Indicator */}
            <div className="flex items-center gap-2 min-w-[100px]">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${status === 'ready'
                    ? 'bg-green-500'
                    : status === 'scanning'
                      ? 'bg-primary animate-pulse'
                      : status === 'complete'
                        ? 'bg-green-500'
                        : 'bg-destructive'
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
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && status === 'error' && (
          <div className="mt-3 px-3 py-2 bg-destructive/10 border border-destructive/50 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}
      </form>
    </div>
  )
}
