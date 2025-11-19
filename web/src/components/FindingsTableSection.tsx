import { Finding } from '../api'
import { FindingsView } from './FindingsView'

interface FindingsTableSectionProps {
  findings: Finding[]
  tenantId: string
  loading: boolean
}

/**
 * FindingsTableSection - Wrapper component for the Findings Table view
 * 
 * This component wraps the existing FindingsView component.
 * Filters are now managed internally by the FindingsDataTable component.
 */
export function FindingsTableSection({
  findings,
  tenantId,
  loading,
}: FindingsTableSectionProps) {
  return (
    <FindingsView
      findings={findings}
      tenantId={tenantId}
      loading={loading}
    />
  )
}
