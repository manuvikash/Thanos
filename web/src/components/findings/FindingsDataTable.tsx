import { useState, useEffect, useMemo } from 'react'
import { Finding } from '@/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SeverityBadge } from './SeverityBadge'
import { FindingsFilters } from './FindingsFilters'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import FindingDetailsSheet from './FindingDetailsSheet'

interface FindingsDataTableProps {
  findings: Finding[]
  totalCount: number
  loading?: boolean
  itemsPerPage?: number
}

type SortColumn = 'severity' | 'resource_type' | 'rule_id' | 'resource_arn' | 'message' | 'region' | 'category'
type SortDirection = 'asc' | 'desc' | null

// Utility function to extract AWS resource type from ARN
function extractResourceType(arn: string): string {
  if (!arn) return 'UNKNOWN'
  
  const parts = arn.split(':')
  if (parts.length >= 3 && parts[0] === 'arn' && parts[1] === 'aws') {
    return parts[2].toUpperCase()
  }
  return 'UNKNOWN'
}

// Utility function to truncate long strings
function truncate(str: string, maxLen: number = 40): string {
  if (str.length <= maxLen) return str
  return str.substring(0, maxLen) + '...'
}

// Utility function to render category badge
function getCategoryBadge(category?: string) {
  switch (category) {
    case 'compliance':
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Compliance</Badge>
    case 'type-golden':
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Golden Config</Badge>
    case 'instance-golden':
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Critical Golden Config</Badge>
    default:
      return <Badge variant="outline">Compliance</Badge>
  }
}

export function FindingsDataTable({ findings, totalCount, loading = false, itemsPerPage = 20 }: FindingsDataTableProps) {
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Extract unique resource types from findings
  const availableResourceTypes = useMemo(() => {
    const types = new Set<string>()
    findings.forEach((finding) => {
      types.add(extractResourceType(finding.resource_arn))
    })
    return Array.from(types).sort()
  }, [findings])

  // Extract unique regions from findings
  const availableRegions = useMemo(() => {
    const regions = new Set<string>()
    findings.forEach((finding) => {
      if (finding.region) {
        regions.add(finding.region)
      }
    })
    return Array.from(regions).sort()
  }, [findings])

  // Extract unique categories from findings
  const availableCategories = useMemo(() => {
    const categories = new Set<string>()
    findings.forEach((finding) => {
      const category = finding.category || 'compliance'
      categories.add(category)
    })
    return Array.from(categories).sort()
  }, [findings])

  // Apply filters to findings
  const filteredFindings = useMemo(() => {
    return findings.filter((finding) => {
      // Severity filter
      if (severityFilter.length > 0 && !severityFilter.includes(finding.severity)) {
        return false
      }

      // Resource type filter
      if (resourceTypeFilter && resourceTypeFilter !== 'all' && extractResourceType(finding.resource_arn) !== resourceTypeFilter) {
        return false
      }

      // Region filter
      if (regionFilter && regionFilter !== 'all' && finding.region !== regionFilter) {
        return false
      }

      // Category filter
      if (categoryFilter && categoryFilter !== 'all') {
        const findingCategory = finding.category || 'compliance'
        if (findingCategory !== categoryFilter) {
          return false
        }
      }

      return true
    })
  }, [findings, severityFilter, resourceTypeFilter, regionFilter])

  // Clear all filters
  const handleClearFilters = () => {
    setSeverityFilter([])
    setResourceTypeFilter('all')
    setRegionFilter('all')
    setCategoryFilter('all')
    setCurrentPage(1)
  }

  // Reset to page 1 when findings or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [findings, severityFilter, resourceTypeFilter, regionFilter, categoryFilter])

  // Handle column header click for sorting
  const handleSort = (column: SortColumn) => {
    setCurrentPage(1) // Reset to first page when sorting changes
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortColumn(null)
      }
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort filtered findings based on current sort state
  const sortedFindings = [...filteredFindings].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0

    let aValue: string | number
    let bValue: string | number

    switch (sortColumn) {
      case 'severity':
        // Sort by severity level (CRITICAL > HIGH > MEDIUM > LOW)
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
        aValue = severityOrder[a.severity as keyof typeof severityOrder] || 0
        bValue = severityOrder[b.severity as keyof typeof severityOrder] || 0
        break
      case 'resource_type':
        aValue = extractResourceType(a.resource_arn)
        bValue = extractResourceType(b.resource_arn)
        break
      case 'rule_id':
        aValue = a.rule_id
        bValue = b.rule_id
        break
      case 'resource_arn':
        aValue = a.resource_arn
        bValue = b.resource_arn
        break
      case 'message':
        aValue = a.message
        bValue = b.message
        break
      case 'region':
        aValue = a.region
        bValue = b.region
        break
      case 'category':
        aValue = a.category || 'compliance'
        bValue = b.category || 'compliance'
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Render sort indicator
  const SortIndicator = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    return <ArrowDown className="ml-2 h-4 w-4" />
  }

  // Calculate pagination
  const totalPages = Math.ceil(sortedFindings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedFindings = sortedFindings.slice(startIndex, endIndex)

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
          <CardDescription>Loading findings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading findings...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (findings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
          <CardDescription>No findings to display</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            No findings yet. Run a scan to get started.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Findings</CardTitle>
        <CardDescription>
          Showing {filteredFindings.length} of {totalCount} findings
          {(severityFilter.length > 0 || (resourceTypeFilter && resourceTypeFilter !== 'all')) && ' (filtered)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <FindingsFilters
          severityFilter={severityFilter}
          resourceTypeFilter={resourceTypeFilter}
          regionFilter={regionFilter}
          categoryFilter={categoryFilter}
          availableResourceTypes={availableResourceTypes}
          availableRegions={availableRegions}
          availableCategories={availableCategories}
          onSeverityChange={setSeverityFilter}
          onResourceTypeChange={setResourceTypeFilter}
          onRegionChange={setRegionFilter}
          onCategoryChange={setCategoryFilter}
          onClearFilters={handleClearFilters}
        />

        {/* Empty state for filtered results */}
        {filteredFindings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No findings match the selected filters. Try adjusting your filter criteria.
          </div>
        ) : (
          <>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => handleSort('severity')}
                    className={cn(
                      'flex items-center hover:text-foreground transition-colors',
                      sortColumn === 'severity' && 'text-foreground'
                    )}
                  >
                    Severity
                    <SortIndicator column="severity" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('category')}
                    className={cn(
                      'flex items-center hover:text-foreground transition-colors',
                      sortColumn === 'category' && 'text-foreground'
                    )}
                  >
                    Category
                    <SortIndicator column="category" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('resource_type')}
                    className={cn(
                      'flex items-center hover:text-foreground transition-colors',
                      sortColumn === 'resource_type' && 'text-foreground'
                    )}
                  >
                    Resource Type
                    <SortIndicator column="resource_type" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('rule_id')}
                    className={cn(
                      'flex items-center hover:text-foreground transition-colors',
                      sortColumn === 'rule_id' && 'text-foreground'
                    )}
                  >
                    Rule ID
                    <SortIndicator column="rule_id" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('resource_arn')}
                    className={cn(
                      'flex items-center hover:text-foreground transition-colors',
                      sortColumn === 'resource_arn' && 'text-foreground'
                    )}
                  >
                    Resource
                    <SortIndicator column="resource_arn" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('message')}
                    className={cn(
                      'flex items-center hover:text-foreground transition-colors',
                      sortColumn === 'message' && 'text-foreground'
                    )}
                  >
                    Message
                    <SortIndicator column="message" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('region')}
                    className={cn(
                      'flex items-center hover:text-foreground transition-colors',
                      sortColumn === 'region' && 'text-foreground'
                    )}
                  >
                    Region
                    <SortIndicator column="region" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFindings.map((finding) => (
                <TableRow 
                  key={finding.finding_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedFinding(finding)}
                >
                  <TableCell>
                    <SeverityBadge severity={finding.severity} />
                  </TableCell>
                  <TableCell>
                    {getCategoryBadge(finding.category)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {extractResourceType(finding.resource_arn)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {finding.rule_id}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {truncate(finding.resource_arn, 40)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {finding.message}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {finding.region}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({startIndex + 1}-{Math.min(endIndex, sortedFindings.length)} of {sortedFindings.length} items)
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className={cn(
                      'cursor-pointer',
                      currentPage === 1 && 'pointer-events-none opacity-50'
                    )}
                  />
                </PaginationItem>

                {getPageNumbers().map((page, index) => (
                  <PaginationItem key={index}>
                    {page === 'ellipsis' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className={cn(
                      'cursor-pointer',
                      currentPage === totalPages && 'pointer-events-none opacity-50'
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
          </>
        )}
      </CardContent>
      <FindingDetailsSheet 
        isOpen={!!selectedFinding} 
        onClose={() => setSelectedFinding(null)} 
        finding={selectedFinding} 
      />
    </Card>
  )
}
