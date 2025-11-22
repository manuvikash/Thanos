import { useEffect, useState } from 'react'
import { Finding, Resource, getResources } from '../api'
import { FindingsView } from './FindingsView'
import ResourcesTable from './ResourcesTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'

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
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    // Fetch resources to show compliance status alongside findings
    const fetchResources = async () => {
      // Only fetch if a scan has completed (snapshotKey exists)
      if (!snapshotKey || !tenantId || loading) {
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
  }, [tenantId, loading, snapshotKey])

  // Show findings if there are any
  if (findings.length > 0 || loading) {
    const compliantResources = resources.filter(r => 
      r.compliance_status === 'COMPLIANT' || r.compliance_status === 'NOT_EVALUATED'
    )
    
    return (
      <div className="space-y-6">
        <FindingsView
          findings={findings}
          tenantId={tenantId}
          loading={loading}
        />
        
        {/* Collapsible section for compliant and not-evaluated resources */}
        {showResources && !loading && compliantResources.length > 0 && (
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <CardTitle>Compliant & Not Evaluated Resources</CardTitle>
                </div>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
              <CardDescription>
                {compliantResources.length} resource{compliantResources.length !== 1 ? 's' : ''} without findings 
                ({resources.filter(r => r.compliance_status === 'COMPLIANT').length} compliant, {resources.filter(r => r.compliance_status === 'NOT_EVALUATED').length} not evaluated)
              </CardDescription>
            </CardHeader>
            {isExpanded && (
              <CardContent>
                <ResourcesTable
                  resources={compliantResources}
                  loading={loadingResources}
                />
              </CardContent>
            )}
          </Card>
        )}
      </div>
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
