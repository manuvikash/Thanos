import { DashboardMetrics } from '../api'
import { SectionHeader } from './SectionHeader'
import { FindingsTimeline } from './FindingsTimeline'
import { EmptyState, EmptyIcon } from './EmptyState'
import { ErrorState } from './ErrorState'
import { FindingsTimelineSkeleton } from './LoadingSkeleton'

interface FindingsTimelineSectionProps {
  tenantId: string
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  onRefresh: () => void
}

export function FindingsTimelineSection({
  tenantId: _tenantId,
  metrics,
  loading,
  error,
  lastUpdated,
  onRefresh,
}: FindingsTimelineSectionProps) {
  // Check if there is sufficient timeline data (at least 1 data point)
  const hasTimelineData = metrics && metrics.timeline.length > 0

  return (
    <div className="p-6">
      <SectionHeader
        title="Findings Timeline"
        lastUpdated={lastUpdated}
        onRefresh={onRefresh}
        loading={loading}
      />

      <div className="w-full">
        {loading && !metrics ? (
          <FindingsTimelineSkeleton />
        ) : error ? (
          <ErrorState
            title="Failed to Load Timeline"
            message={error}
            onRetry={onRefresh}
          />
        ) : !metrics || !hasTimelineData ? (
          <EmptyState
            icon={<EmptyIcon />}
            title="Insufficient Data"
            message="Not enough scan history to display timeline. Run more scans to build up historical data."
          />
        ) : (
          <FindingsTimeline timeline={metrics.timeline} />
        )}
      </div>
    </div>
  )
}
