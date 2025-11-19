import { TrendingUp } from 'lucide-react'
import { DashboardMetrics } from '../api'
import { SectionHeader } from './SectionHeader'
import { TimelineChart } from './dashboard/TimelineChart'
import { EmptyState } from './shared/EmptyState'
import { ErrorAlert } from './shared/ErrorAlert'
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
          <ErrorAlert
            title="Failed to Load Timeline"
            message={error}
            onRetry={onRefresh}
          />
        ) : !metrics || !hasTimelineData ? (
          <EmptyState
            icon={TrendingUp}
            title="Insufficient Data"
            description="Not enough scan history to display timeline. Run more scans to build up historical data."
          />
        ) : (
          <TimelineChart timeline={metrics.timeline} />
        )}
      </div>
    </div>
  )
}
