import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import HorizontalScanBar from './HorizontalScanBar'
import { OverviewMetricsSection } from './OverviewMetricsSection'
import { SeverityDistributionSection } from './SeverityDistributionSection'
import { TopFailingRulesSection } from './TopFailingRulesSection'
import { FindingsTimelineSection } from './FindingsTimelineSection'
import { FindingsTableSection } from './FindingsTableSection'
import { Finding, DashboardMetrics, getDashboardMetrics } from '../api'
import { ROUTES } from '../routes'

interface ContentAreaProps {
  tenantId: string
  findings: Finding[]
  loading: boolean
  onScanComplete: (findings: Finding[], stats: { resources: number; findings: number }, tenantId: string, snapshotKey: string) => void
  onLoadingChange: (loading: boolean) => void
  severityFilter: string[]
  resourceTypeFilter: string
  onSeverityFilterChange: (severities: string[]) => void
  onResourceTypeFilterChange: (type: string) => void
}

export function ContentArea({
  tenantId,
  findings,
  loading,
  onScanComplete: originalOnScanComplete,
  onLoadingChange,
  severityFilter,
  resourceTypeFilter,
  onSeverityFilterChange,
  onResourceTypeFilterChange,
}: ContentAreaProps) {
  const location = useLocation()
  
  // Dashboard metrics state
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Cache to avoid redundant API calls
  const metricsCache = useRef<{
    tenantId: string
    data: DashboardMetrics
    timestamp: number
  } | null>(null)
  
  // Scroll position tracking for each section
  const scrollPositions = useRef<Record<string, number>>({})
  const contentRef = useRef<HTMLDivElement>(null)
  const previousPath = useRef<string>(location.pathname)
  
  // Cache duration: 30 seconds
  const CACHE_DURATION_MS = 30000
  
  // Shared metrics fetching function
  const fetchMetrics = useCallback(async (forceRefresh = false) => {
    if (!tenantId) {
      setMetrics(null)
      setMetricsError(null)
      setLastUpdated(null)
      return
    }
    
    // Check cache if not forcing refresh
    if (!forceRefresh && metricsCache.current) {
      const { tenantId: cachedTenantId, data, timestamp } = metricsCache.current
      const now = Date.now()
      
      // Use cached data if it's for the same tenant and not expired
      if (cachedTenantId === tenantId && now - timestamp < CACHE_DURATION_MS) {
        setMetrics(data)
        setMetricsError(null)
        return
      }
    }
    
    setMetricsLoading(true)
    setMetricsError(null)
    
    try {
      const data = await getDashboardMetrics(tenantId)
      setMetrics(data)
      setLastUpdated(new Date())
      
      // Update cache
      metricsCache.current = {
        tenantId,
        data,
        timestamp: Date.now(),
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard metrics'
      setMetricsError(errorMessage)
    } finally {
      setMetricsLoading(false)
    }
  }, [tenantId])
  
  // Fetch metrics when tenantId changes
  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])
  
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
      snapshotKey: string
    ) => {
      // Call the original handler
      originalOnScanComplete(findings, stats, tenantId, snapshotKey)
      
      // Refresh dashboard metrics after scan completion
      // Use a small delay to ensure backend has processed the scan
      setTimeout(() => {
        fetchMetrics(true)
      }, 1000)
    },
    [originalOnScanComplete, fetchMetrics]
  )
  
  // Refresh handler that forces a refresh
  const handleRefresh = async () => {
    await fetchMetrics(true)
  }

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
            onRefresh={handleRefresh}
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
            onRefresh={handleRefresh}
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
            onRefresh={handleRefresh}
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
            onRefresh={handleRefresh}
          />
        )
      case ROUTES.FINDINGS:
        return (
          <FindingsTableSection
            findings={findings}
            tenantId={tenantId}
            loading={loading}
            severityFilter={severityFilter}
            resourceTypeFilter={resourceTypeFilter}
            onSeverityFilterChange={onSeverityFilterChange}
            onResourceTypeFilterChange={onResourceTypeFilterChange}
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
        onLoadingChange={onLoadingChange}
        currentTenantId={tenantId}
      />

      {/* Route-based section rendering with scroll container */}
      <div ref={contentRef} className="overflow-y-auto flex-1">
        {renderSection()}
      </div>
    </>
  )
}
