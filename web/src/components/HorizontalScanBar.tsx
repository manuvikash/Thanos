import { FormEvent } from 'react'
import { Finding } from '../api'
import { Spinner } from './ui/spinner'
import { useScanLogic, ScanMode } from '../hooks/useScanLogic'

interface HorizontalScanBarProps {
  onScanComplete: (
    findings: Finding[],
    stats: { resources: number; findings: number },
    tenantId: string,
    snapshotKey: string,
    scanMode?: ScanMode,
    scanTarget?: string
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
  currentTenantId,
  onReset,
}: HorizontalScanBarProps) {
  const {
    customers,
    tenantId,
    scanMode,
    selectedRegion,
    supportedRegions,
    status,
    progress,
    error,
    loadingCustomers,
    handleCustomerChange,
    handleScanModeChange,
    handleRegionChange,
    executeScan,
    resetSelection,
  } = useScanLogic({
    onScanComplete,
    onScanError,
    onLoadingChange,
    currentTenantId,
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await executeScan()
  }

  const handleResetClick = () => {
    resetSelection()
    onReset()
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
    <div className="sticky top-0 z-10 bg-background border-b backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="px-6 py-4">
        <div className="flex flex-col gap-4">
          {/* Scan Mode Selector */}
          <div className="flex items-center gap-3 border-b border-neutral-700 pb-4">
            <span className="text-sm font-medium text-neutral-300">Scan by:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleScanModeChange('customer')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  scanMode === 'customer'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                disabled={status === 'scanning'}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => handleScanModeChange('region')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  scanMode === 'region'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                disabled={status === 'scanning'}
              >
                Region
              </button>
            </div>
          </div>

          {/* Dynamic Controls based on Scan Mode */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Left group: Mode-specific controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {scanMode === 'customer' ? (
                // Customer Selector
                <div className="flex-1 min-w-[200px] max-w-[300px]">
                  <select
                    value={tenantId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    disabled={loadingCustomers || status === 'scanning'}
                    className="w-full h-11 px-3 bg-input border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">
                      {loadingCustomers ? 'Loading...' : 'Select Customer'}
                    </option>
                    {customers.map((customer) => (
                      <option key={customer.tenant_id} value={customer.tenant_id}>
                        {customer.customer_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                // Region Selector
                <div className="flex-1 min-w-[200px] max-w-[300px]">
                  <select
                    value={selectedRegion}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    disabled={loadingCustomers || status === 'scanning'}
                    className="w-full h-11 px-3 bg-input border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">Select Region</option>
                    {supportedRegions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Scan Button */}
              <button
                type="submit"
                disabled={
                  (scanMode === 'customer' && (!tenantId || status === 'scanning' || loadingCustomers)) ||
                  (scanMode === 'region' && (!selectedRegion || status === 'scanning' || loadingCustomers))
                }
                className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[120px]"
              >
                {status === 'scanning' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    Scanning
                  </span>
                ) : (
                  'Run Scan'
                )}
              </button>

              {/* Reset Button */}
              <button
                type="button"
                onClick={handleResetClick}
                disabled={
                  (scanMode === 'customer' && (!tenantId || status === 'scanning')) ||
                  (scanMode === 'region' && (!selectedRegion || status === 'scanning'))
                }
                className="h-11 px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                title="Reset selection"
              >
                Reset
              </button>
            </div>

            {/* Right group: Status and Progress */}
            <div className="flex items-center gap-4 lg:border-l lg:border-neutral-700 lg:pl-4">
              {/* Status Indicator */}
              <div className="flex items-center gap-2 min-w-[100px]">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${status === 'ready'
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
