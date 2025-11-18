import { useState, useEffect } from 'react'
import { getDashboardMetrics, DashboardMetrics } from '../api'
import { DashboardMetrics as DashboardMetricsComponent } from './DashboardMetrics'
import { SeverityDistribution } from './SeverityDistribution'
import { TopFailingRules } from './TopFailingRules'
import { FindingsTimeline } from './FindingsTimeline'

interface FindingsDashboardProps {
  tenantId: string
  onError?: (error: Error) => void
}

export function FindingsDashboard({ tenantId, onError }: FindingsDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Fetch dashboard metrics when tenantId changes
  useEffect(() => {
    if (!tenantId) {
      setMetrics(null)
      setError(null)
      return
    }

    const fetchMetrics = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getDashboardMetrics(tenantId)
        setMetrics(data)
        setLastUpdated(new Date())
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard metrics'
        setError(errorMessage)
        
        if (onError && err instanceof Error) {
          onError(err)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [tenantId, onError])

  // Handle refresh (used for both retry and manual refresh)
  const handleRefresh = async () => {
    if (!tenantId) return

    setLoading(true)
    setError(null)

    try {
      const data = await getDashboardMetrics(tenantId)
      setMetrics(data)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard metrics'
      setError(errorMessage)
      
      if (onError && err instanceof Error) {
        onError(err)
      }
    } finally {
      setLoading(false)
    }
  }

  // Format last updated timestamp
  const formatLastUpdated = (date: Date | null): string => {
    if (!date) return ''
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    
    if (diffSecs < 60) {
      return 'Just now'
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleTimeString()
    }
  }

  // Empty state when no tenant is selected
  if (!tenantId) {
    return (
      <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-12 backdrop-blur-sm text-center">
        <div className="text-neutral-400 mb-2">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-neutral-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-lg font-medium">Select a tenant to view dashboard</p>
          <p className="text-sm text-neutral-500 mt-2">
            Choose a tenant from the scan form to see metrics and analytics
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-12 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-16 h-16 mb-4">
            {/* Spinner matching existing design */}
            <div className="absolute inset-0 border-4 border-neutral-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-neutral-400 font-mono-custom">Loading dashboard metrics...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-[#102020]/50 border border-red-900/50 rounded-lg p-12 backdrop-blur-sm text-center">
        <div className="text-red-400 mb-4">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-lg font-medium mb-2">Failed to load dashboard</p>
          <p className="text-sm text-neutral-400 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-neutral-900 font-semibold rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // No data state
  if (!metrics) {
    return (
      <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-12 backdrop-blur-sm text-center">
        <div className="text-neutral-400">
          <p className="text-lg font-medium">No dashboard data available</p>
          <p className="text-sm text-neutral-500 mt-2">
            Run a scan to generate metrics
          </p>
        </div>
      </div>
    )
  }

  // Main dashboard with 2x2 grid layout
  return (
    <div className="space-y-6">
      {/* Dashboard header with refresh button and last updated timestamp */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-neutral-200">Dashboard Overview</h2>
          {lastUpdated && (
            <span className="text-sm text-neutral-500 font-mono-custom">
              Updated {formatLastUpdated(lastUpdated)}
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-200 rounded-lg transition-colors border border-neutral-700"
          aria-label="Refresh dashboard"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="font-medium">{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Dashboard grid - 2x2 on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top left: Total findings with trend */}
        <DashboardMetricsComponent
          currentScan={metrics.current_scan}
          previousScan={metrics.previous_scan}
        />

        {/* Top right: Severity distribution */}
        <SeverityDistribution
          severityCounts={metrics.current_scan.severity_counts}
        />

        {/* Bottom left: Top failing rules */}
        <TopFailingRules rules={metrics.top_rules} />

        {/* Bottom right: Timeline chart */}
        <FindingsTimeline timeline={metrics.timeline} />
      </div>
    </div>
  )
}
