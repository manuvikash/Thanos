import { DashboardMetrics, Customer } from '../api'
import { Inbox } from 'lucide-react'
import { EmptyState } from './shared/EmptyState'

interface PerCustomerMetricBoxProps {
    customer: Customer
    metrics: DashboardMetrics | null
    loading: boolean
    error: string | null
}

function PerCustomerMetricBox({
    customer,
    metrics,
    loading,
    error,
}: PerCustomerMetricBoxProps) {
    const totalFindings = metrics?.current_scan?.total_findings ?? 0
    const previousFindings = metrics?.previous_scan?.total_findings ?? 0
    const change = previousFindings > 0 ? ((totalFindings - previousFindings) / previousFindings) * 100 : 0

    return (
        <div className="border border-neutral-700 rounded-lg p-4 bg-neutral-900/50 hover:bg-neutral-900/70 transition-colors">
            {loading ? (
                <div className="space-y-2">
                    <div className="h-4 bg-neutral-700 rounded w-3/4 animate-pulse"></div>
                    <div className="h-6 bg-neutral-700 rounded w-1/2 animate-pulse"></div>
                </div>
            ) : error ? (
                <div className="text-red-400 text-sm">
                    <p className="font-semibold">{customer.customer_name}</p>
                    <p className="text-xs mt-1">Error loading metrics</p>
                </div>
            ) : (
                <>
                    <div className="mb-3">
                        <p className="text-sm font-medium text-neutral-300">{customer.customer_name}</p>
                        <p className="text-xs text-neutral-500 mt-1">{customer.account_id}</p>
                    </div>

                    <div className="space-y-2">
                        <div>
                            <p className="text-xs text-neutral-400 uppercase tracking-wide">Findings</p>
                            <div className="flex items-baseline justify-between mt-1">
                                <p className="text-2xl font-bold text-cyan-400">{totalFindings}</p>
                                <p
                                    className={`text-xs font-medium ${
                                        change > 0
                                            ? 'text-red-400'
                                            : change < 0
                                              ? 'text-green-400'
                                              : 'text-neutral-400'
                                    }`}
                                >
                                    {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                </p>
                            </div>
                            {previousFindings > 0 && (
                                <p className="text-xs text-neutral-500 mt-1">
                                    Previous: {previousFindings}
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

interface RegionalMetricsGridProps {
    metricsState: {
        [tenantId: string]: {
            customer: Customer
            metrics: DashboardMetrics | null
            loading: boolean
            error: string | null
        }
    }
    loading: boolean
    error: string | null
}

export function RegionalMetricsGrid({
    metricsState,
    loading,
    error,
}: RegionalMetricsGridProps) {
    const items = Object.values(metricsState)

    if (loading && items.length === 0) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-neutral-800 rounded-lg animate-pulse" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-700/50 bg-red-900/30 p-4">
                <p className="text-red-300 text-sm">{error}</p>
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <EmptyState
                icon={Inbox}
                title="No Customers"
                description="No customers found for this region."
            />
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
                <PerCustomerMetricBox
                    key={item.customer.tenant_id}
                    customer={item.customer}
                    metrics={item.metrics}
                    loading={item.loading}
                    error={item.error}
                />
            ))}
        </div>
    )
}
