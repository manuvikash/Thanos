import { Finding, Customer } from '../api'
import { FindingsView } from './FindingsView'
import { RegionalFindingsView } from './findings/RegionalFindingsView'
import { ScanMode } from '../hooks/useScanLogic'

interface FindingsTableSectionProps {
  findings: Finding[]
  tenantId: string
  loading: boolean
  selectedCustomer?: Customer | null
  scanMode?: ScanMode
}

/**
 * FindingsTableSection - Wrapper component for the Findings Table view
 * 
 * This component wraps the existing FindingsView component or shows
 * RegionalFindingsView when a specific customer is selected.
 */
export function FindingsTableSection({
  findings,
  tenantId,
  loading,
  selectedCustomer,
  scanMode = 'customer',
}: FindingsTableSectionProps) {
  // Show regional view when a specific customer is selected in customer mode
  if (scanMode === 'customer' && selectedCustomer && tenantId) {
    return (
      <RegionalFindingsView
        findings={findings}
        tenantId={tenantId}
        loading={loading}
        customerName={selectedCustomer.customer_name}
      />
    )
  }

  // Default view for region mode or when no customer is selected
  return (
    <FindingsView
      findings={findings}
      tenantId={tenantId}
      loading={loading}
    />
  )
}
