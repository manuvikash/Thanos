import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface FindingsFiltersProps {
  severityFilter: string[]
  resourceTypeFilter: string
  availableResourceTypes: string[]
  onSeverityChange: (severities: string[]) => void
  onResourceTypeChange: (type: string) => void
  onClearFilters: () => void
}

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

export function FindingsFilters({
  severityFilter,
  resourceTypeFilter,
  availableResourceTypes,
  onSeverityChange,
  onResourceTypeChange,
  onClearFilters,
}: FindingsFiltersProps) {
  const handleSeverityToggle = (severity: string) => {
    if (severityFilter.includes(severity)) {
      onSeverityChange(severityFilter.filter((s) => s !== severity))
    } else {
      onSeverityChange([...severityFilter, severity])
    }
  }

  const activeFilterCount = severityFilter.length + (resourceTypeFilter && resourceTypeFilter !== 'all' ? 1 : 0)
  const hasActiveFilters = activeFilterCount > 0

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Severity Filter */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">Severity</Label>
          <div className="flex flex-wrap gap-3">
            {SEVERITY_OPTIONS.map((severity) => (
              <div key={severity} className="flex items-center gap-2">
                <Checkbox
                  id={`severity-${severity}`}
                  checked={severityFilter.includes(severity)}
                  onCheckedChange={() => handleSeverityToggle(severity)}
                />
                <Label
                  htmlFor={`severity-${severity}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {severity}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Type Filter */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="resource-type-select" className="text-sm font-medium">
            Resource Type
          </Label>
          <Select value={resourceTypeFilter} onValueChange={onResourceTypeChange}>
            <SelectTrigger id="resource-type-select" className="w-[200px]">
              <SelectValue placeholder="All Resource Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resource Types</SelectItem>
              {availableResourceTypes.map((type) => (
                <SelectItem key={type} value={type} className="font-mono">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium opacity-0">Actions</Label>
            <Button variant="outline" onClick={onClearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Active Filter Count Badge */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
          </Badge>
        </div>
      )}
    </div>
  )
}
