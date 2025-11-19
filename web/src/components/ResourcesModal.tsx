import { useEffect, useState } from 'react'
import { getResources, ResourceDetail, ResourcesResponse } from '../api'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, AlertCircle } from 'lucide-react'
import ResourceDetailsSheet from './findings/ResourceDetailsSheet'

interface ResourcesModalProps {
  isOpen: boolean
  onClose: () => void
  tenantId: string
  snapshotKey: string
  totalCount: number
}

interface ResourceGroup {
  type: string
  count: number
  resources: ResourceDetail[]
  isExpanded: boolean
}

export default function ResourcesModal({
  isOpen,
  onClose,
  tenantId,
  snapshotKey,
  totalCount,
}: ResourcesModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resourcesData, setResourcesData] = useState<ResourcesResponse | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [groupedResources, setGroupedResources] = useState<ResourceGroup[]>([])
  const [selectedResource, setSelectedResource] = useState<ResourceDetail | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    if (isOpen && tenantId && snapshotKey) {
      fetchResources()
    }
  }, [isOpen, tenantId, snapshotKey])

  useEffect(() => {
    if (resourcesData) {
      processResources()
    }
  }, [resourcesData, searchQuery])

  const fetchResources = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getResources(tenantId, snapshotKey)
      setResourcesData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources')
    } finally {
      setLoading(false)
    }
  }

  const processResources = () => {
    if (!resourcesData) return

    // Filter resources based on search query
    const filtered = resourcesData.resources.filter((resource) => {
      const query = searchQuery.toLowerCase()
      return (
        resource.resource_type.toLowerCase().includes(query) ||
        resource.arn.toLowerCase().includes(query)
      )
    })

    // Group by resource type
    const grouped = filtered.reduce((acc, resource) => {
      const existing = acc.find((g) => g.type === resource.resource_type)
      if (existing) {
        existing.resources.push(resource)
        existing.count++
      } else {
        acc.push({
          type: resource.resource_type,
          count: 1,
          resources: [resource],
          isExpanded: false,
        })
      }
      return acc
    }, [] as ResourceGroup[])

    // Sort alphabetically by type
    grouped.sort((a, b) => a.type.localeCompare(b.type))

    setGroupedResources(grouped)
  }

  const toggleGroup = (type: string) => {
    setGroupedResources((groups) =>
      groups.map((g) => (g.type === type ? { ...g, isExpanded: !g.isExpanded } : g))
    )
  }

  const handleResourceClick = (resource: ResourceDetail) => {
    setSelectedResource(resource)
    setIsDetailsOpen(true)
  }

  const handleDetailsClose = () => {
    setIsDetailsOpen(false)
    setSelectedResource(null)
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="font-mono-custom">
              Resources Scanned ({totalCount})
            </SheetTitle>
            <SheetDescription>
              View all resources that were scanned in this snapshot
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Search Bar */}
            {!loading && !error && (
              <Input
                type="text"
                placeholder="Filter by resource type or ARN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            )}

            {/* Content Area */}
            <ScrollArea className="h-[calc(100vh-200px)]">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading resources...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                  <p className="text-foreground mb-4">{error}</p>
                  <Button onClick={fetchResources}>Retry</Button>
                </div>
              )}

              {!loading && !error && groupedResources.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No resources found matching your search.</p>
                </div>
              )}

              {!loading && !error && groupedResources.length > 0 && (
                <div className="space-y-2 pr-4">
                  {groupedResources.map((group) => (
                    <div key={group.type} className="border rounded-lg overflow-hidden">
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroup(group.type)}
                        className="w-full px-4 py-3 bg-muted/50 hover:bg-muted transition-colors flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-expanded={group.isExpanded}
                        aria-controls={`group-${group.type}`}
                      >
                        <div className="flex items-center gap-3">
                          <ChevronRight
                            className={`w-5 h-5 text-muted-foreground transition-transform ${
                              group.isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                          <span className="text-foreground font-medium font-mono-custom">
                            {group.type}
                          </span>
                          <Badge variant="secondary">{group.count}</Badge>
                        </div>
                      </button>

                      {/* Group Content */}
                      {group.isExpanded && (
                        <div id={`group-${group.type}`} className="bg-card/50">
                          {group.resources.map((resource, idx) => (
                            <button
                              key={`${resource.arn}-${idx}`}
                              onClick={() => handleResourceClick(resource)}
                              className="w-full px-4 py-3 border-t hover:bg-muted/30 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <div className="text-sm text-foreground font-mono-custom break-all mb-1">
                                {resource.arn}
                              </div>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>Region: {resource.region}</span>
                                <span>Account: {resource.account_id}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <ResourceDetailsSheet
        isOpen={isDetailsOpen}
        onClose={handleDetailsClose}
        resource={selectedResource}
      />
    </>
  )
}
