import { Finding } from '../api'
import { FindingsView } from './FindingsView'

interface FindingsTableSectionProps {
  findings: Finding[]
  tenantId: string
  loading: boolean
  severityFilter: string[]
  resourceTypeFilter: string
  onSeverityFilterChange: (severities: string[]) => void
  onResourceTypeFilterChange: (type: string) => void
}

/**
 * FindingsTableSection - Wrapper component for the Findings Table view
 * 
 * This component wraps the existing FindingsView component and preserves
 * filter state (severity, resource type) across navigation.
 */
export function FindingsTableSection({
  findings,
  tenantId,
  loading,
  severityFilter,
  resourceTypeFilter,
  onSeverityFilterChange,
  onResourceTypeFilterChange,
}: FindingsTableSectionProps) {
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
