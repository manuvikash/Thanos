import { useEffect, useState, useMemo } from 'react'
import { Finding, Resource, getResources, getCustomers, Customer } from '../api'
import { FindingsView } from './FindingsView'
import ResourcesTable from './ResourcesTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { CheckCircle2, ChevronDown, ChevronRight, Filter } from 'lucide-react'
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
 * When tenantId is 'all', shows a customer filter dropdown.
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
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('all')

  // Fetch customers for filter dropdown when showing all customers
  useEffect(() => {
    if (tenantId === 'all') {
      const fetchCustomers = async () => {
        try {
          const customerList = await getCustomers()
          setCustomers(customerList)
        } catch (error) {
          console.error('Failed to load customers:', error)
        }
      }
      fetchCustomers()
    }
  }, [tenantId])

  // Filter findings based on selected customer
  const filteredFindings = useMemo(() => {
    if (tenantId !== 'all' || selectedCustomerFilter === 'all') {
      return findings
    }
    return findings.filter(f => f.tenant_id === selectedCustomerFilter)
  }, [findings, tenantId, selectedCustomerFilter])

  // Get unique tenant IDs from filtered findings for resource fetching
  const activeTenantId = useMemo(() => {
    if (tenantId !== 'all') return tenantId
    if (selectedCustomerFilter !== 'all') return selectedCustomerFilter
    // When showing all, use the first tenant ID from findings
    return filteredFindings.length > 0 ? filteredFindings[0].tenant_id : ''
  }, [tenantId, selectedCustomerFilter, filteredFindings])

  useEffect(() => {
    // Fetch resources to show compliance status alongside findings
    const fetchResources = async () => {
      // Only fetch if a scan has completed (snapshotKey exists)
      if (!snapshotKey || !activeTenantId || loading) {
        setShowResources(false)
        return
      }

      setLoadingResources(true)
      try {
        const response = await getResources(activeTenantId, snapshotKey, undefined, undefined, 1000)
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
  }, [activeTenantId, loading, snapshotKey])

  // Show findings if there are any
  if (filteredFindings.length > 0 || loading) {
    const compliantResources = resources.filter(r => 
      r.compliance_status === 'COMPLIANT' || r.compliance_status === 'NOT_EVALUATED'
    )
    
    return (
      <div className="space-y-6">
        {/* Customer Filter (only when showing all customers) */}
        {tenantId === 'all' && customers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <CardTitle className="text-base">Filter by Customer</CardTitle>
                  <CardDescription>
                    Showing {selectedCustomerFilter === 'all' ? 'all customers' : customers.find(c => c.tenant_id === selectedCustomerFilter)?.customer_name || 'selected customer'}
                  </CardDescription>
                </div>
                <select
                  value={selectedCustomerFilter}
                  onChange={(e) => setSelectedCustomerFilter(e.target.value)}
                  className="px-4 py-2 bg-input border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors min-w-[200px]"
                >
                  <option value="all">All Customers ({findings.length} findings)</option>
                  {customers.map((customer) => {
                    const customerFindings = findings.filter(f => f.tenant_id === customer.tenant_id)
                    return (
                      <option key={customer.tenant_id} value={customer.tenant_id}>
                        {customer.customer_name} ({customerFindings.length})
                      </option>
                    )
                  })}
                </select>
              </div>
            </CardHeader>
          </Card>
        )}

        <FindingsView
          findings={filteredFindings}
          tenantId={activeTenantId}
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
