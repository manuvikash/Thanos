import { useEffect, useState } from 'react'
import { Finding, getFindings } from '../api'
import FilterControls from './FilterControls'

interface FindingsTableProps {
  findings: Finding[]
  tenantId: string
  loading: boolean
}

// Utility function to extract AWS resource type from ARN
// Example: arn:aws:s3:::my-bucket → "S3"
// Example: arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0 → "EC2"
function extractResourceType(arn: string): string {
  if (!arn) return 'UNKNOWN'
  
  const parts = arn.split(':')
  if (parts.length >= 3 && parts[0] === 'arn' && parts[1] === 'aws') {
    return parts[2].toUpperCase()
  }
  return 'UNKNOWN'
}

// Get unique resource types from findings array
function getUniqueResourceTypes(findings: Finding[]): string[] {
  const types = new Set<string>()
  findings.forEach(finding => {
    types.add(extractResourceType(finding.resource_arn))
  })
  return Array.from(types).sort()
}

// Apply filters to findings based on severity and resource type
function applyFilters(
  findings: Finding[],
  severityFilter: string[],
  resourceTypeFilter: string
): Finding[] {
  return findings.filter(finding => {
    // Severity filter - if array is not empty, finding must match one of the selected severities
    if (severityFilter.length > 0 && !severityFilter.includes(finding.severity)) {
      return false
    }
    
    // Resource type filter - if set, finding must match the selected resource type
    if (resourceTypeFilter && extractResourceType(finding.resource_arn) !== resourceTypeFilter) {
      return false
    }
    
    return true
  })
}

export default function FindingsTable({ findings: initialFindings, tenantId, loading }: FindingsTableProps) {
  const [allFindings, setAllFindings] = useState<Finding[]>(initialFindings)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>()
  
  // Filter state management
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('')

  useEffect(() => {
    setAllFindings(initialFindings)
  }, [initialFindings])

  // Handler for severity filter changes
  const handleSeverityChange = (severities: string[]) => {
    setSeverityFilter(severities)
  }

  // Handler for resource type filter changes
  const handleResourceTypeChange = (type: string) => {
    setResourceTypeFilter(type)
  }

  // Clear all filters
  const clearFilters = () => {
    setSeverityFilter([])
    setResourceTypeFilter('')
  }

  const loadMore = async () => {
    if (!tenantId || !cursor) return

    setLoadingMore(true)
    try {
      const response = await getFindings(tenantId, 50, cursor)
      setAllFindings([...allFindings, ...response.items])
      setCursor(response.next_cursor)
    } catch (err) {
      console.error('Error loading more findings:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-900/30'
      case 'HIGH':
        return 'text-orange-400 bg-orange-900/30'
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-900/30'
      case 'LOW':
        return 'text-blue-400 bg-blue-900/30'
      default:
        return 'text-neutral-400 bg-neutral-900/30'
    }
  }

  const truncate = (str: string, maxLen: number = 60) => {
    if (str.length <= maxLen) return str
    return str.substring(0, maxLen) + '...'
  }

  if (loading) {
    return (
      <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-8 backdrop-blur-sm text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        <p className="mt-4 text-neutral-400">Running scan...</p>
      </div>
    )
  }

  if (allFindings.length === 0) {
    return (
      <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-8 backdrop-blur-sm text-center">
        <p className="text-neutral-400">No findings yet. Run a scan to get started.</p>
      </div>
    )
  }

  // Get unique resource types for filter dropdown
  const availableResourceTypes = getUniqueResourceTypes(allFindings)
  
  // Apply filters to findings
  const filteredFindings = applyFilters(allFindings, severityFilter, resourceTypeFilter)

  return (
    <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg backdrop-blur-sm">
      <div className="px-4 sm:px-6 py-4 border-b border-neutral-800">
        <h2 className="text-2xl font-semibold text-neutral-100 font-mono-custom">Findings</h2>
      </div>

      {/* Filter Controls */}
      <FilterControls
        severityFilter={severityFilter}
        resourceTypeFilter={resourceTypeFilter}
        availableResourceTypes={availableResourceTypes}
        onSeverityChange={handleSeverityChange}
        onResourceTypeChange={handleResourceTypeChange}
        onClearFilters={clearFilters}
      />

      {/* Findings Count */}
      <div className="px-4 sm:px-6 py-3 border-b border-neutral-800">
        <p className="text-sm text-neutral-400">
          Showing {filteredFindings.length} of {allFindings.length} findings
        </p>
      </div>

      {/* Empty State for Filtered Results */}
      {filteredFindings.length === 0 ? (
        <div className="px-4 sm:px-6 py-12 text-center">
          <p className="text-neutral-400 text-lg mb-4">No findings match the current filters</p>
          <button
            onClick={clearFilters}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-6 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0C1A1A]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Resource Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Rule ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Region
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredFindings.map((finding) => (
                <tr key={finding.finding_id} className="hover:bg-[#0C1A1A]/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(finding.severity)}`}>
                      {finding.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-mono bg-neutral-800/50 text-neutral-300 rounded">
                      {extractResourceType(finding.resource_arn)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-300 font-mono-custom">
                    {finding.rule_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-300 font-mono-custom">
                    {truncate(finding.resource_arn, 40)}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-300">
                    {finding.message}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-400">
                    {finding.region}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cursor && (
        <div className="px-4 sm:px-6 py-4 border-t border-gray-700 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="bg-neutral-700 hover:bg-neutral-600 text-neutral-100 font-medium py-2 px-6 rounded-md transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
