import { FileX } from 'lucide-react'
import { DashboardMetrics } from '../api'
import { SectionHeader } from './SectionHeader'
import { TopRulesChart } from './dashboard/TopRulesChart'
import { EmptyState } from './shared/EmptyState'
import { ErrorAlert } from './shared/ErrorAlert'
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
            <ErrorAlert
              title="Failed to Load Rules"
              message={error}
              onRetry={onRefresh}
            />
          ) : !metrics || !hasRules ? (
            <EmptyState
              icon={FileX}
              title="No Rules"
              description="No failing rules to display. Run a scan to see which rules are failing most frequently."
            />
          ) : (
            <TopRulesChart rules={metrics.top_rules} />
          )}
        </div>
      </div>
    </div>
  )
}
