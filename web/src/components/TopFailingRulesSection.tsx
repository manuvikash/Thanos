import { DashboardMetrics } from '../api'
import { SectionHeader } from './SectionHeader'
import { TopFailingRules } from './TopFailingRules'
import { EmptyState, EmptyIcon } from './EmptyState'
import { ErrorState } from './ErrorState'
import { TopFailingRulesSkeleton } from './LoadingSkeleton'

interface TopFailingRulesSectionProps {
  tenantId: string
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  onRefresh: () => void
}

export function TopFailingRulesSection({
  tenantId: _tenantId,
  metrics,
  loading,
  error,
  lastUpdated,
  onRefresh,
}: TopFailingRulesSectionProps) {
  // Check if there are any rules with findings
  const hasRules = metrics && metrics.top_rules.length > 0

  return (
    <div className="p-6">
      <SectionHeader
        title="Top Failing Rules"
        lastUpdated={lastUpdated}
        onRefresh={onRefresh}
        loading={loading}
      />

      <div className="flex justify-center">
        <div className="w-full max-w-3xl">
          {loading && !metrics ? (
            <TopFailingRulesSkeleton />
          ) : error ? (
            <ErrorState
              title="Failed to Load Rules"
              message={error}
              onRetry={onRefresh}
            />
          ) : !metrics || !hasRules ? (
            <EmptyState
              icon={<EmptyIcon />}
              title="No Rules"
              message="No failing rules to display. Run a scan to see which rules are failing most frequently."
            />
          ) : (
            <TopFailingRules rules={metrics.top_rules} />
          )}
        </div>
      </div>
    </div>
  )
}
