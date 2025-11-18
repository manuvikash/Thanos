import FindingsTable from './FindingsTable'
import { Finding } from '../api'

interface FindingsViewProps {
  findings: Finding[]
  tenantId: string
  loading: boolean
  severityFilter: string[]
  resourceTypeFilter: string
  onSeverityFilterChange: (severities: string[]) => void
  onResourceTypeFilterChange: (type: string) => void
}

export function FindingsView({
  findings,
  tenantId,
  loading,
  severityFilter,
  resourceTypeFilter,
  onSeverityFilterChange,
  onResourceTypeFilterChange,
}: FindingsViewProps) {
  return (
    <div>
      <FindingsTable
        findings={findings}
        tenantId={tenantId}
        loading={loading}
        severityFilter={severityFilter}
        resourceTypeFilter={resourceTypeFilter}
        onSeverityFilterChange={onSeverityFilterChange}
        onResourceTypeFilterChange={onResourceTypeFilterChange}
      />
    </div>
  )
}
