import { useEffect, useState } from 'react'
import { getResources, ResourceDetail, ResourcesResponse } from '../api'

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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resources-modal-title"
    >
      <div className="bg-[#102020] border border-neutral-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col m-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 id="resources-modal-title" className="text-2xl font-semibold text-neutral-100 font-mono-custom">
            Resources Scanned ({totalCount})
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 transition-colors p-2 rounded-md hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        {!loading && !error && (
          <div className="px-6 py-4 border-b border-neutral-800">
            <input
              type="text"
              placeholder="Filter by resource type or ARN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0C1A1A] border border-neutral-700 rounded-md px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              aria-label="Search resources"
            />
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
              <p className="mt-4 text-neutral-400">Loading resources...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-red-400 mb-4">
                <svg
                  className="w-16 h-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-neutral-300 mb-4">{error}</p>
              <button
                onClick={fetchResources}
                className="bg-cyan-600 hover:bg-cyan-700 text-neutral-100 font-medium py-2 px-6 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && groupedResources.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-400">No resources found matching your search.</p>
            </div>
          )}

          {!loading && !error && groupedResources.length > 0 && (
            <div className="space-y-2">
              {groupedResources.map((group) => (
                <div key={group.type} className="border border-neutral-800 rounded-lg overflow-hidden">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.type)}
                    className="w-full px-4 py-3 bg-[#0C1A1A] hover:bg-[#0C1A1A]/70 transition-colors flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-expanded={group.isExpanded}
                    aria-controls={`group-${group.type}`}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className={`w-5 h-5 text-neutral-400 transition-transform ${
                          group.isExpanded ? 'rotate-90' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-neutral-100 font-medium font-mono-custom">{group.type}</span>
                      <span className="text-sm text-neutral-400 bg-neutral-800 px-2 py-1 rounded">
                        {group.count}
                      </span>
                    </div>
                  </button>

                  {/* Group Content */}
                  {group.isExpanded && (
                    <div id={`group-${group.type}`} className="bg-[#102020]/50">
                      {group.resources.map((resource, idx) => (
                        <div
                          key={`${resource.arn}-${idx}`}
                          className="px-4 py-3 border-t border-neutral-800 hover:bg-[#0C1A1A]/30 transition-colors"
                        >
                          <div className="text-sm text-neutral-300 font-mono-custom break-all mb-1">
                            {resource.arn}
                          </div>
                          <div className="flex gap-4 text-xs text-neutral-500">
                            <span>Region: {resource.region}</span>
                            <span>Account: {resource.account_id}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
