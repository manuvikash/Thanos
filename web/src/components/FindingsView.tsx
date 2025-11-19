import FindingsTable from './FindingsTable'
import { Finding } from '../api'

interface FindingsViewProps {
  findings: Finding[]
  tenantId: string
  loading: boolean
}

export function FindingsView({
  findings,
  tenantId,
  loading,
}: FindingsViewProps) {
  return (
    <div>
      <FindingsTable
        findings={findings}
        tenantId={tenantId}
        loading={loading}
      />
    </div>
  )
}
