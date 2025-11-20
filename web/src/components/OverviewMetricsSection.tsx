import { Inbox } from 'lucide-react'
import { DashboardMetrics } from '../api'
import { SectionHeader } from './SectionHeader'
import { DashboardMetrics as DashboardMetricsWidget } from './DashboardMetrics'
import { EmptyState } from './shared/EmptyState'
import { ErrorAlert } from './shared/ErrorAlert'
import { OverviewMetricsSkeleton } from './LoadingSkeleton'
import { RegionalMetricsGrid } from './RegionalMetricsGrid'
import { useRegionalMetrics } from '../hooks/useRegionalMetrics'
import { ScanMode } from '../hooks/useScanLogic'

interface OverviewMetricsSectionProps {
  tenantId: string
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  onRefresh: () => void
  scanMode?: ScanMode
  scanTarget?: string
}

export function OverviewMetricsSection({
  tenantId: _tenantId,
  metrics,
  loading,
  error,
  lastUpdated,
  onRefresh,
  scanMode = 'customer',
  scanTarget,
}: OverviewMetricsSectionProps) {
  const isRegionMode = scanMode === 'region' && !!scanTarget
  const {
    metricsState,
    loading: regionalLoading,
    error: regionalError,
    lastUpdated: regionalLastUpdated,
    refreshMetrics: refreshRegionalMetrics,
  } = useRegionalMetrics({ region: scanTarget || '', enabled: isRegionMode })

  return (
    <div className="p-6">
      <SectionHeader
        title={isRegionMode ? `Regional Metrics - ${scanTarget}` : 'Overview Metrics'}
        lastUpdated={isRegionMode ? regionalLastUpdated : lastUpdated}
        onRefresh={isRegionMode ? refreshRegionalMetrics : onRefresh}
        loading={isRegionMode ? regionalLoading : Boolean(loading)}
      />

      {isRegionMode ? (
        // Region mode: show per-customer grid
        <div className="w-full">
          <RegionalMetricsGrid
            metricsState={metricsState}
            loading={regionalLoading}
            error={regionalError}
          />
        </div>
      ) : (
        // Customer mode: show single customer metrics
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            {loading && !metrics ? (
              <OverviewMetricsSkeleton />
            ) : error ? (
              <ErrorAlert
                title="Failed to Load Metrics"
                message={error}
                onRetry={onRefresh}
              />
            ) : !metrics ? (
              <EmptyState
                icon={Inbox}
                title="No Data Available"
                description="Run a scan to view overview metrics for this tenant."
              />
            ) : (
              <DashboardMetricsWidget
                currentScan={metrics.current_scan}
                previousScan={metrics.previous_scan}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
