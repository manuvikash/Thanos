import { RefreshCw, AlertTriangle, ShieldAlert, AlertCircle, Info } from 'lucide-react'
import { DashboardMetrics } from '../api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SeverityChart } from './dashboard/SeverityChart'
import { TopResourcesChart } from './dashboard/TopResourcesChart'
import { TimelineChart } from './dashboard/TimelineChart'
import { EmptyState } from './shared/EmptyState'
import { ErrorAlert } from './shared/ErrorAlert'
import { OverviewMetricsSkeleton } from './LoadingSkeleton'
import { formatDistanceToNow } from 'date-fns'

interface DashboardViewProps {
  tenantId: string
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  onRefresh: () => void
}

export function DashboardView({
  tenantId: _tenantId,
  metrics,
  loading,
  error,
  lastUpdated,
  onRefresh,
}: DashboardViewProps) {
  
  if (loading && !metrics) {
    return <OverviewMetricsSkeleton />
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorAlert
          title="Failed to Load Dashboard"
          message={error}
          onRetry={onRefresh}
        />
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertCircle}
          title="No Data Available"
          description="Run a scan to view dashboard metrics for this tenant."
        />
      </div>
    )
  }

  const { current_scan, previous_scan } = metrics
  const severityCounts = current_scan.severity_counts

  // Calculate trend
  const calculateTrend = () => {
    if (!previous_scan || previous_scan.total_findings === 0) return null
    const change = current_scan.total_findings - previous_scan.total_findings
    const percentage = (change / previous_scan.total_findings) * 100
    return {
      value: Math.abs(percentage).toFixed(1),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      isPositive: change < 0 // Fewer findings is positive
    }
  }

  const trend = calculateTrend()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your security posture and compliance status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{current_scan.total_findings}</div>
            {trend && (
              <p className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'} flex items-center mt-1`}>
                {trend.direction === 'up' ? '↑' : '↓'} {trend.value}% from last scan
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{severityCounts.CRITICAL}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Severity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{severityCounts.HIGH}</div>
            <p className="text-xs text-muted-foreground mt-1">Fix as soon as possible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium & Low</CardTitle>
            <Info className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {severityCounts.MEDIUM + severityCounts.LOW}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {severityCounts.MEDIUM} Medium, {severityCounts.LOW} Low
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <SeverityChart severityCounts={metrics.current_scan.severity_counts} />
          </CardContent>
        </Card>
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Top Failing Resource Types</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <TopResourcesChart resources={metrics.top_resources} />
          </CardContent>
        </Card>
      </div>

      {/* Timeline Row */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Findings Timeline</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <TimelineChart timeline={metrics.timeline} />
        </CardContent>
      </Card>
    </div>
  )
}
