import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardMetrics, getDashboardMetrics } from '../api'

interface UseDashboardMetricsProps {
    tenantId: string
}

export function useDashboardMetrics({ tenantId }: UseDashboardMetricsProps) {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    // Cache to avoid redundant API calls
    const metricsCache = useRef<{
        tenantId: string
        data: DashboardMetrics
        timestamp: number
    } | null>(null)

    // Cache duration: 30 seconds
    const CACHE_DURATION_MS = 30000

    const fetchMetrics = useCallback(
        async (forceRefresh = false, overrideTenantId?: string) => {
            const effectiveTenantId = overrideTenantId || tenantId

            if (!effectiveTenantId) {
                setMetrics(null)
                setError(null)
                setLastUpdated(null)
                return
            }

            // Check cache if not forcing refresh
            if (!forceRefresh && metricsCache.current) {
                const {
                    tenantId: cachedTenantId,
                    data,
                    timestamp,
                } = metricsCache.current
                const now = Date.now()

                // Use cached data if it's for the same tenant and not expired
                if (
                    cachedTenantId === effectiveTenantId &&
                    now - timestamp < CACHE_DURATION_MS
                ) {
                    setMetrics(data)
                    setError(null)
                    return
                }
            }

            setLoading(true)
            setError(null)

            try {
                const data = await getDashboardMetrics(effectiveTenantId)
                setMetrics(data)
                setLastUpdated(new Date())

                // Update cache
                metricsCache.current = {
                    tenantId: effectiveTenantId,
                    data,
                    timestamp: Date.now(),
                }
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to load dashboard metrics'

                // Handle 404 or "No findings" as a valid empty state
                if (errorMessage.includes('404') || errorMessage.includes('No findings') || errorMessage.includes('No valid scan data')) {
                    const emptyMetrics: DashboardMetrics = {
                        tenant_id: effectiveTenantId,
                        current_scan: {
                            snapshot_key: '',
                            timestamp: new Date().toISOString(),
                            total_findings: 0,
                            severity_counts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
                        },
                        previous_scan: null,
                        top_resources: [],
                        timeline: []
                    }
                    setMetrics(emptyMetrics)
                    setLastUpdated(new Date())
                    // Cache the empty state too
                    metricsCache.current = {
                        tenantId: effectiveTenantId,
                        data: emptyMetrics,
                        timestamp: Date.now(),
                    }
                } else {
                    setError(errorMessage)
                }
            } finally {
                setLoading(false)
            }
        },
        [tenantId]
    )

    // Fetch metrics when tenantId changes
    useEffect(() => {
        fetchMetrics()
    }, [fetchMetrics])

    const refreshMetrics = useCallback(async (overrideTenantId?: string) => {
        await fetchMetrics(true, overrideTenantId)
    }, [fetchMetrics])

    return {
        metrics,
        loading,
        error,
        lastUpdated,
        refreshMetrics,
    }
}
