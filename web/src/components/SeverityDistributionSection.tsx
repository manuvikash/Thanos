import { DashboardMetrics } from '../api'
import { SectionHeader } from './SectionHeader'
import { SeverityDistribution } from './SeverityDistribution'
import { EmptyState, EmptyIcon } from './EmptyState'
import { ErrorState } from './ErrorState'
import { SeverityDistributionSkeleton } from './LoadingSkeleton'

interface SeverityDistributionSectionProps {
  tenantId: string
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  onRefresh: () => void
}

export function SeverityDistributionSection({
  tenantId: _tenantId,
  metrics,
  loading,
  error,
  lastUpdated,
  onRefresh,
}: SeverityDistributionSectionProps) {
  // Check if there are any findings
  const hasFindings = metrics && metrics.current_scan.total_findings > 0

  return (
    <div className="p-6">
      <SectionHeader
        title="Severity Distribution"
        lastUpdated={lastUpdated}
        onRefresh={onRefresh}
        loading={loading}
      />

      <div className="flex justify-center">
        <div className="w-full max-w-3xl">
          {loading && !metrics ? (
            <SeverityDistributionSkeleton />
          ) : error ? (
            <ErrorState
              title="Failed to Load Distribution"
              message={error}
              onRetry={onRefresh}
            />
          ) : !metrics || !hasFindings ? (
            <EmptyState
              icon={<EmptyIcon />}
              title="No Findings"
              message="No findings available to display severity distribution. Run a scan to see the breakdown."
            />
          ) : (
            <SeverityDistribution severityCounts={metrics.current_scan.severity_counts} />
          )}
        </div>
      </div>
    </div>
  )
}
