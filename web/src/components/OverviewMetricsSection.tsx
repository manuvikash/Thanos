import { DashboardMetrics } from '../api'
import { SectionHeader } from './SectionHeader'
import { DashboardMetrics as DashboardMetricsWidget } from './DashboardMetrics'
import { EmptyState, EmptyIcon } from './EmptyState'
import { ErrorState } from './ErrorState'
import { OverviewMetricsSkeleton } from './LoadingSkeleton'

interface OverviewMetricsSectionProps {
  tenantId: string
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  onRefresh: () => void
}

export function OverviewMetricsSection({
  tenantId: _tenantId,
  metrics,
  loading,
  error,
  lastUpdated,
  onRefresh,
}: OverviewMetricsSectionProps) {
  return (
    <div className="p-6">
      <SectionHeader
        title="Overview Metrics"
        lastUpdated={lastUpdated}
        onRefresh={onRefresh}
        loading={loading}
      />

      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          {loading && !metrics ? (
            <OverviewMetricsSkeleton />
          ) : error ? (
            <ErrorState
              title="Failed to Load Metrics"
              message={error}
              onRetry={onRefresh}
            />
          ) : !metrics ? (
            <EmptyState
              icon={<EmptyIcon />}
              title="No Data Available"
              message="Run a scan to view overview metrics for this tenant."
            />
          ) : (
            <DashboardMetricsWidget
              currentScan={metrics.current_scan}
              previousScan={metrics.previous_scan}
            />
          )}
        </div>
      </div>
    </div>
  )
}
