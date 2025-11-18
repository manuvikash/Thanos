import { DashboardView } from './DashboardView'
import { FindingsView } from './FindingsView'
import { Finding } from '../api'

interface ContentAreaProps {
  currentView: 'dashboard' | 'findings'
  tenantId: string
  findings: Finding[]
  scanStats: { resources: number; findings: number } | null
  loading: boolean
  snapshotKey: string
  onOpenResourcesModal: () => void
  onScanComplete: (findings: Finding[], stats: { resources: number; findings: number }, tenantId: string, snapshotKey: string) => void
  onLoadingChange: (loading: boolean) => void
  severityFilter: string[]
  resourceTypeFilter: string
  onSeverityFilterChange: (severities: string[]) => void
  onResourceTypeFilterChange: (type: string) => void
}

export function ContentArea({
  currentView,
  tenantId,
  findings,
  scanStats,
  loading,
  snapshotKey,
  onOpenResourcesModal,
  onScanComplete,
  onLoadingChange,
  severityFilter,
  resourceTypeFilter,
  onSeverityFilterChange,
  onResourceTypeFilterChange,
}: ContentAreaProps) {
  if (currentView === 'dashboard') {
    return (
      <DashboardView
        tenantId={tenantId}
        scanStats={scanStats}
        snapshotKey={snapshotKey}
        onOpenResourcesModal={onOpenResourcesModal}
        onScanComplete={onScanComplete}
        onLoadingChange={onLoadingChange}
      />
    )
  }

  if (currentView === 'findings') {
    return (
      <FindingsView
        findings={findings}
        tenantId={tenantId}
        loading={loading}
        severityFilter={severityFilter}
        resourceTypeFilter={resourceTypeFilter}
        onSeverityFilterChange={onSeverityFilterChange}
        onResourceTypeFilterChange={onResourceTypeFilterChange}
      />
    )
  }

  // Fallback to dashboard if invalid view
  return (
    <DashboardView
      tenantId={tenantId}
      scanStats={scanStats}
      snapshotKey={snapshotKey}
      onOpenResourcesModal={onOpenResourcesModal}
      onScanComplete={onScanComplete}
      onLoadingChange={onLoadingChange}
    />
  )
}
