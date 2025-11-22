import { useState } from 'react'
import { Resource } from '../api'
import { Badge } from './ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Button } from './ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ResourcesTableProps {
  resources: Resource[]
  loading: boolean
  onResourceClick?: (resource: Resource) => void
}

type SortField = 'resource_type' | 'compliance_status' | 'drift_score' | 'findings_count'
type SortDirection = 'asc' | 'desc'

export default function ResourcesTable({
  resources,
  loading,
  onResourceClick,
}: ResourcesTableProps) {
  const [sortField, setSortField] = useState<SortField>('compliance_status')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedResources = [...resources].sort((a, b) => {
    let aVal: any = a[sortField]
    let bVal: any = b[sortField]

    // Handle compliance_status special sorting
    if (sortField === 'compliance_status') {
      const statusOrder = { 'NON_COMPLIANT': 0, 'NOT_EVALUATED': 1, 'COMPLIANT': 2 }
      aVal = statusOrder[aVal as keyof typeof statusOrder] ?? 999
      bVal = statusOrder[bVal as keyof typeof statusOrder] ?? 999
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const getComplianceBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'default'
      case 'NON_COMPLIANT':
        return 'destructive'
      case 'NOT_EVALUATED':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getDriftColor = (score: number) => {
    if (score === 0) return 'text-green-600 dark:text-green-400'
    if (score < 0.3) return 'text-yellow-600 dark:text-yellow-400'
    if (score < 0.7) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="inline ml-1 w-4 h-4" />
    ) : (
      <ChevronDown className="inline ml-1 w-4 h-4" />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  if (resources.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No resources found
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-accent/50"
              onClick={() => handleSort('resource_type')}
            >
              Type <SortIcon field="resource_type" />
            </TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>Region</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-accent/50"
              onClick={() => handleSort('compliance_status')}
            >
              Status <SortIcon field="compliance_status" />
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-accent/50 text-right"
              onClick={() => handleSort('drift_score')}
            >
              Drift <SortIcon field="drift_score" />
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-accent/50 text-right"
              onClick={() => handleSort('findings_count')}
            >
              Findings <SortIcon field="findings_count" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedResources.map((resource, index) => {
            const arn = resource.arn || 'unknown'
            const shortName = arn.split('/').pop() || 
                            arn.split(':').pop() || 
                            arn
            const driftPercentage = ((resource.drift_score || 0) * 100).toFixed(1)

            return (
              <TableRow
                key={resource.arn || `resource-${index}`}
                className={onResourceClick ? 'cursor-pointer hover:bg-accent/50' : ''}
                onClick={() => onResourceClick?.(resource)}
              >
                <TableCell className="font-medium">
                  <span className="text-xs text-muted-foreground">
                    {(resource.resource_type || 'UNKNOWN').replace('AWS::', '')}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm" title={arn}>
                    {shortName}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {resource.region || 'N/A'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={getComplianceBadgeVariant(resource.compliance_status || 'NOT_EVALUATED')}>
                    {resource.compliance_status || 'NOT_EVALUATED'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-semibold ${getDriftColor(resource.drift_score || 0)}`}>
                    {driftPercentage}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {(resource.findings_count || 0) > 0 ? (
                    <Badge variant="destructive">{resource.findings_count}</Badge>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">✓</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
