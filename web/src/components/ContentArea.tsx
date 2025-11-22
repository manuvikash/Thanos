import { useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import HorizontalScanBar from './HorizontalScanBar'
import { DashboardView } from './DashboardView'
import { FindingsTableSection } from './FindingsTableSection'
import { Finding } from '../api'
import { ROUTES } from '../routes'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'

interface ContentAreaProps {
  tenantId: string
  findings: Finding[]
  loading: boolean
  snapshotKey: string
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
  snapshotKey,
  onScanComplete: originalOnScanComplete,
  onScanError,
  onLoadingChange,
  onReset,
}: ContentAreaProps) {
  const location = useLocation()

  // Use custom hook for dashboard metrics
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
    lastUpdated,
    refreshMetrics,
  } = useDashboardMetrics({ tenantId })

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
      snapshotKey: string
    ) => {
      // Call the original handler
      originalOnScanComplete(findings, stats, tenantId, snapshotKey)

      // Refresh dashboard metrics after scan completion
      // Use a small delay to ensure backend has processed the scan
      setTimeout(() => {
        refreshMetrics(tenantId)
      }, 1000)
    },
    [originalOnScanComplete, refreshMetrics]
  )

  // Determine which section to render based on current route
  const renderSection = () => {
    const path = location.pathname

    if (path === ROUTES.DASHBOARD) {
      return (
        <DashboardView
          tenantId={tenantId}
          metrics={metrics}
          loading={metricsLoading}
          error={metricsError}
          lastUpdated={lastUpdated}
          onRefresh={() => refreshMetrics(tenantId)}
        />
      )
    }

    if (path === ROUTES.FINDINGS) {
      return (
        <FindingsTableSection
          findings={findings}
          tenantId={tenantId}
          loading={loading}
          snapshotKey={snapshotKey}
        />
      )
    }

    return null
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
      />

      {/* Route-based section rendering with scroll container */}
      <div ref={contentRef} className="overflow-y-auto flex-1">
        {renderSection()}
      </div>
    </>
  )
}

