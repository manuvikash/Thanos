import { useEffect, useCallback, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import HorizontalScanBar from './HorizontalScanBar'
import { OverviewMetricsSection } from './OverviewMetricsSection'
import { SeverityDistributionSection } from './SeverityDistributionSection'
import { TopFailingRulesSection } from './TopFailingRulesSection'
import { FindingsTimelineSection } from './FindingsTimelineSection'
import { FindingsTableSection } from './FindingsTableSection'
import { Finding, Customer } from '../api'
import { ROUTES } from '../routes'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'
import { ScanMode } from '../hooks/useScanLogic'

interface ContentAreaProps {
  tenantId: string
  findings: Finding[]
  loading: boolean
  onScanComplete: (
    findings: Finding[],
    stats: { resources: number; findings: number },
    tenantId: string,
    snapshotKey: string
  ) => void
  onScanError: (error: string) => void
  onLoadingChange: (loading: boolean) => void
  onReset: () => void
}

export function ContentArea({
  tenantId,
  findings,
  loading,
  onScanComplete: originalOnScanComplete,
  onScanError,
  onLoadingChange,
  onReset,
}: ContentAreaProps) {
  const location = useLocation()
  const [lastScanMode, setLastScanMode] = useState<ScanMode | null>(null)
  const [lastScanTarget, setLastScanTarget] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [regionalRefreshKey, setRegionalRefreshKey] = useState(0)

  // Handler that clears findings when customer changes
  const handleCustomerChange = useCallback(
    (customer: Customer | null) => {
      console.log('[ContentArea] Customer changed:', customer?.customer_name || 'None')
      
      // Clear stale findings and metrics BEFORE setting new customer
      onReset()
      setLastScanMode(null)
      setLastScanTarget(null)
      
      // Then update the selected customer
      setSelectedCustomer(customer)
    },
    [onReset]
  )

  // Use custom hook for dashboard metrics (only in customer mode)
  // In region mode, tenantId will be empty, so we skip this
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
    lastUpdated,
    refreshMetrics,
  } = useDashboardMetrics({ tenantId: (lastScanMode === 'region' ? '' : tenantId) })

  // Scroll position tracking for each section
  const scrollPositions = useRef<Record<string, number>>({})
  const contentRef = useRef<HTMLDivElement>(null)
  const previousPath = useRef<string>(location.pathname)

  // Save scroll position when navigating away from a section
  useEffect(() => {
    const currentPath = location.pathname

    // Save scroll position of previous path
    if (previousPath.current !== currentPath && contentRef.current) {
      const scrollTop = contentRef.current.scrollTop
      scrollPositions.current[previousPath.current] = scrollTop
    }

    // Restore scroll position for current path
    if (contentRef.current) {
      const savedScrollPosition = scrollPositions.current[currentPath]
      if (savedScrollPosition !== undefined) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          if (contentRef.current) {
            contentRef.current.scrollTop = savedScrollPosition
          }
        }, 0)
      } else {
        // Reset to top if no saved position
        contentRef.current.scrollTop = 0
      }
    }

    // Update previous path
    previousPath.current = currentPath
  }, [location.pathname])

  // Clear scroll positions when tenant changes
  useEffect(() => {
    scrollPositions.current = {}
    if (contentRef.current) {
      contentRef.current.scrollTop = 0
    }
  }, [tenantId])

  // Wrapped onScanComplete handler that refreshes dashboard metrics
  const handleScanComplete = useCallback(
    async (
      findings: Finding[],
      stats: { resources: number; findings: number },
      tenantId: string,
      snapshotKey: string,
      scanMode?: ScanMode,
      scanTarget?: string
    ) => {
      console.log('[ContentArea] Scan complete:', { scanMode, scanTarget, tenantId })
      
      // Store scan mode and target for display
      if (scanMode) {
        setLastScanMode(scanMode)
        setLastScanTarget(scanTarget || null)
      }

      // Call the original handler
      originalOnScanComplete(findings, stats, tenantId, snapshotKey)

      // Only refresh customer metrics for customer scans, not region scans
      // Region scans will use useRegionalMetrics hook instead
      if (scanMode === 'customer' && tenantId && tenantId !== 'cross-account') {
        setTimeout(() => {
          console.log('[ContentArea] Refreshing customer metrics for:', tenantId)
          refreshMetrics(tenantId)
        }, 1000)
      } else if (scanMode === 'region') {
        console.log('[ContentArea] Region scan - triggering regional metrics refresh')
        // Trigger regional metrics refresh by incrementing the key
        setTimeout(() => {
          setRegionalRefreshKey(prev => prev + 1)
        }, 1000)
      }
    },
    [originalOnScanComplete, refreshMetrics]
  )

  // Determine which section to render based on current route
  const renderSection = () => {
    const path = location.pathname

    switch (path) {
      case ROUTES.DASHBOARD.OVERVIEW_METRICS:
        return (
          <OverviewMetricsSection
            tenantId={tenantId}
            metrics={metrics}
            loading={metricsLoading}
            error={metricsError}
            lastUpdated={lastUpdated}
            onRefresh={refreshMetrics}
            scanMode={lastScanMode || 'customer'}
            scanTarget={lastScanTarget || undefined}
            selectedCustomer={selectedCustomer}
            regionalRefreshKey={regionalRefreshKey}
          />
        )
      case ROUTES.DASHBOARD.SEVERITY_DISTRIBUTION:
        return (
          <SeverityDistributionSection
            tenantId={tenantId}
            metrics={metrics}
            loading={metricsLoading}
            error={metricsError}
            lastUpdated={lastUpdated}
            onRefresh={refreshMetrics}
          />
        )
      case ROUTES.DASHBOARD.TOP_FAILING_RULES:
        return (
          <TopFailingRulesSection
            tenantId={tenantId}
            metrics={metrics}
            loading={metricsLoading}
            error={metricsError}
            lastUpdated={lastUpdated}
            onRefresh={refreshMetrics}
          />
        )
      case ROUTES.DASHBOARD.FINDINGS_TIMELINE:
        return (
          <FindingsTimelineSection
            tenantId={tenantId}
            metrics={metrics}
            loading={metricsLoading}
            error={metricsError}
            lastUpdated={lastUpdated}
            onRefresh={refreshMetrics}
          />
        )
      case ROUTES.FINDINGS:
        return (
          <FindingsTableSection
            findings={findings}
            tenantId={tenantId}
            loading={loading}
            selectedCustomer={selectedCustomer}
            scanMode={lastScanMode || 'customer'}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* Persistent HorizontalScanBar across all sections */}
      <HorizontalScanBar
        onScanComplete={handleScanComplete}
        onScanError={onScanError}
        onLoadingChange={onLoadingChange}
        currentTenantId={tenantId}
        onReset={onReset}
        onCustomerChange={handleCustomerChange}
      />

      {/* Region Scan Info Banner */}
      {lastScanMode === 'region' && lastScanTarget && (
        <div className="bg-blue-900/30 border-b border-blue-700/50 px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-300">Cross-Account Regional Scan</p>
              <p className="text-xs text-blue-300/70">
                Showing combined findings for all customers in <span className="font-semibold">{lastScanTarget}</span> region
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Route-based section rendering with scroll container */}
      <div ref={contentRef} className="overflow-y-auto flex-1">
        {renderSection()}
      </div>
    </>
  )
}

