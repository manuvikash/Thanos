import { CurrentScan, PreviousScan } from '../api'
import { MetricsCard } from './dashboard/MetricsCard'

interface DashboardMetricsProps {
  currentScan: CurrentScan
  previousScan: PreviousScan | null
}

export function DashboardMetrics({ currentScan, previousScan }: DashboardMetricsProps) {
  return (
    <MetricsCard
      totalFindings={currentScan.total_findings}
      timestamp={currentScan.timestamp}
      previousFindings={previousScan?.total_findings}
    />
  )
}
