import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardMetrics, getDashboardMetrics, Customer, getCustomers } from '../api'

interface RegionalMetricsState {
    [tenantId: string]: {
        customer: Customer
        metrics: DashboardMetrics | null
        loading: boolean
        error: string | null
    }
}

interface UseRegionalMetricsProps {
    region: string
    enabled: boolean
}

export function useRegionalMetrics({ region, enabled }: UseRegionalMetricsProps) {
    const [metricsState, setMetricsState] = useState<RegionalMetricsState>({})
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    // Cache to avoid redundant API calls
    const metricsCache = useRef<{
        region: string
        data: RegionalMetricsState
        timestamp: number
    } | null>(null)

    // Cache duration: 30 seconds
    const CACHE_DURATION_MS = 30000

    const fetchRegionalMetrics = useCallback(async (forceRefresh = false) => {
        if (!enabled || !region) {
            setMetricsState({})
            setError(null)
            return
        }

        // Check cache
        if (!forceRefresh && metricsCache.current) {
            const { region: cachedRegion, data, timestamp } = metricsCache.current
            const now = Date.now()

            if (cachedRegion === region && now - timestamp < CACHE_DURATION_MS) {
                setMetricsState(data)
                setError(null)
                return
            }
        }

        setLoading(true)
        setError(null)

        try {
            // Fetch all customers
            const customersData = await getCustomers()
            setCustomers(customersData)

            // Fetch metrics for each customer
            const newState: RegionalMetricsState = {}

            for (const customer of customersData) {
                newState[customer.tenant_id] = {
                    customer,
                    metrics: null,
                    loading: true,
                    error: null,
                }
            }

            setMetricsState(newState)

            // Fetch metrics in parallel
            const metricsPromises = customersData.map(async (customer) => {
                try {
                    const metrics = await getDashboardMetrics(customer.tenant_id)
                    return { tenantId: customer.tenant_id, metrics, error: null }
                } catch (err) {
                    return {
                        tenantId: customer.tenant_id,
                        metrics: null,
                        error: err instanceof Error ? err.message : 'Failed to fetch metrics',
                    }
                }
            })

            const results = await Promise.all(metricsPromises)

            // Update state with results
            const updatedState = { ...newState }
            for (const { tenantId, metrics, error: metricError } of results) {
                if (updatedState[tenantId]) {
                    updatedState[tenantId].metrics = metrics
                    updatedState[tenantId].loading = false
                    updatedState[tenantId].error = metricError
                }
            }

            setMetricsState(updatedState)
            setLastUpdated(new Date())

            // Update cache
            metricsCache.current = {
                region,
                data: updatedState,
                timestamp: Date.now(),
            }
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to load regional metrics'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }, [region, enabled])

    // Fetch metrics when region changes
    useEffect(() => {
        if (enabled) {
            fetchRegionalMetrics()
        }
    }, [region, enabled, fetchRegionalMetrics])

    const refreshMetrics = useCallback(async () => {
        await fetchRegionalMetrics(true)
    }, [fetchRegionalMetrics])

    // Aggregate totals across all customers
    const aggregatedTotals = Object.values(metricsState).reduce(
        (acc, item) => {
            if (item.metrics?.current_scan) {
                acc.totalFindings += item.metrics.current_scan.total_findings
                acc.totalResources += item.metrics.current_scan.severity_counts
                    ? Object.values(item.metrics.current_scan.severity_counts).reduce(
                          (a, b) => a + b,
                          0
                      )
                    : 0
            }
            return acc
        },
        { totalFindings: 0, totalResources: 0 }
    )

    return {
        metricsState,
        customers,
        aggregatedTotals,
        loading,
        error,
        lastUpdated,
        refreshMetrics,
    }
}
