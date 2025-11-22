import { useEffect, useState } from 'react'
import { Finding, Resource, getResources } from '../api'
import { FindingsView } from './FindingsView'
import ResourcesTable from './ResourcesTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { CheckCircle2 } from 'lucide-react'

interface FindingsTableSectionProps {
  findings: Finding[]
  tenantId: string
  loading: boolean
  snapshotKey: string
}

/**
 * FindingsTableSection - Wrapper component for the Findings Table view
 * 
 * This component wraps the existing FindingsView component.
 * When there are no findings but tenant has been scanned, it shows compliant resources.
 */
export function FindingsTableSection({
  findings,
  tenantId,
  loading,
  snapshotKey,
}: FindingsTableSectionProps) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [showResources, setShowResources] = useState(false)

  useEffect(() => {
    // If there are no findings but we have a scan completed (snapshotKey exists)
    // Fetch the resources to display compliance status
    const fetchResources = async () => {
      // Only fetch if:
      // 1. A scan has completed (snapshotKey exists)
      // 2. There are no findings (all resources are compliant)
      // 3. Not currently loading
      if (!snapshotKey || !tenantId || findings.length > 0 || loading) {
        setShowResources(false)
        return
      }

      setLoadingResources(true)
      try {
        const response = await getResources(tenantId, snapshotKey, undefined, undefined, 1000)
        if (response.resources && response.resources.length > 0) {
          setResources(response.resources)
          setShowResources(true)
        } else {
          setShowResources(false)
        }
      } catch (error) {
        console.error('Error fetching resources:', error)
        setShowResources(false)
      } finally {
        setLoadingResources(false)
      }
    }

    fetchResources()
  }, [tenantId, findings, loading, snapshotKey])

  // Show findings if there are any
  if (findings.length > 0 || loading) {
    return (
      <FindingsView
        findings={findings}
        tenantId={tenantId}
        loading={loading}
      />
    )
  }

  // Show resources when no findings exist (all compliant)
  if (showResources) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <CardTitle>All Resources Compliant</CardTitle>
            </div>
            <CardDescription>
              No compliance issues found. Showing {resources.length} compliant resource{resources.length !== 1 ? 's' : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResourcesTable
              resources={resources}
              loading={loadingResources}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state
  return (
    <FindingsView
      findings={findings}
      tenantId={tenantId}
      loading={loading || loadingResources}
    />
  )
}
