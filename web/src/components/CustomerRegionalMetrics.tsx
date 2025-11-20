import { useState, useEffect } from 'react'
import { DashboardMetrics, getDashboardMetrics, Customer } from '../api'
import { DashboardMetrics as DashboardMetricsWidget } from './DashboardMetrics'
import { EmptyState } from './shared/EmptyState'
import { ErrorAlert } from './shared/ErrorAlert'
import { Inbox } from 'lucide-react'

interface CustomerRegionalMetricsProps {
    customer: Customer
    tenantId: string
    onRefresh: () => void
}

export function CustomerRegionalMetrics({
    customer,
    tenantId,
    onRefresh,
}: CustomerRegionalMetricsProps) {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchMetrics = async () => {
            if (!customer.regions || customer.regions.length === 0) {
                return
            }

            setLoading(true)
            setError(null)

            try {
                const metricsData = await getDashboardMetrics(tenantId)
                setMetrics(metricsData)
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load metrics'
                setError(errorMessage)
            } finally {
                setLoading(false)
            }
        }

        fetchMetrics()
    }, [customer, tenantId])

    if (!customer.regions || customer.regions.length === 0) {
        return (
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <EmptyState
                        icon={Inbox}
                        title="No Regions Configured"
                        description="This customer has no regions configured. Please update the customer configuration."
                    />
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {customer.regions.map(region => (
                    <div key={region} className="border border-neutral-700 rounded-lg p-6 bg-neutral-900/30">
                        <h3 className="text-lg font-semibold mb-4 text-cyan-400">{region}</h3>
                        <div className="space-y-3">
                            <div className="h-20 bg-neutral-700 rounded animate-pulse" />
                            <div className="h-16 bg-neutral-700 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <ErrorAlert
                        title="Failed to Load Metrics"
                        message={error}
                        onRetry={onRefresh}
                    />
                </div>
            </div>
        )
    }

    if (!metrics) {
        return (
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <EmptyState
                        icon={Inbox}
                        title="No Data Available"
                        description="Run a scan to view metrics for this customer."
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="text-sm text-neutral-400">
                Showing metrics for {customer.regions.length} region{customer.regions.length !== 1 ? 's' : ''}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {customer.regions.map(region => (
                    <div key={region} className="border border-neutral-700 rounded-lg p-6 bg-neutral-900/30">
                        <h3 className="text-lg font-semibold mb-4 text-cyan-400">{region}</h3>
                        <DashboardMetricsWidget
                            currentScan={metrics.current_scan}
                            previousScan={metrics.previous_scan}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
