import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface FindingsFiltersProps {
  severityFilter: string[]
  resourceTypeFilter: string
  regionFilter: string
  categoryFilter: string
  customerFilter: string
  availableResourceTypes: string[]
  availableRegions: string[]
  availableCategories: string[]
  availableCustomers: Array<{ tenant_id: string; name: string }>
  onSeverityChange: (severities: string[]) => void
  onResourceTypeChange: (type: string) => void
  onRegionChange: (region: string) => void
  onCategoryChange: (category: string) => void
  onCustomerChange: (customer: string) => void
  onClearFilters: () => void
}

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

export function FindingsFilters({
  severityFilter,
  resourceTypeFilter,
  regionFilter,
  categoryFilter,
  customerFilter,
  availableResourceTypes,
  availableRegions,
  availableCategories,
  availableCustomers,
  onSeverityChange,
  onResourceTypeChange,
  onRegionChange,
  onCategoryChange,
  onCustomerChange,
  onClearFilters,
}: FindingsFiltersProps) {
  const handleSeverityToggle = (severity: string) => {
    if (severityFilter.includes(severity)) {
      onSeverityChange(severityFilter.filter((s) => s !== severity))
    } else {
      onSeverityChange([...severityFilter, severity])
    }
  }

  const activeFilterCount = severityFilter.length + (resourceTypeFilter && resourceTypeFilter !== 'all' ? 1 : 0) + (regionFilter && regionFilter !== 'all' ? 1 : 0) + (categoryFilter && categoryFilter !== 'all' ? 1 : 0) + (customerFilter && customerFilter !== 'all' ? 1 : 0)
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

        {/* Region Filter */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="region-select" className="text-sm font-medium">
            Region
          </Label>
          <Select value={regionFilter} onValueChange={onRegionChange}>
            <SelectTrigger id="region-select" className="w-[200px]">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {availableRegions.map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="category-select" className="text-sm font-medium">
            Category
          </Label>
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger id="category-select" className="w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {availableCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === 'compliance' ? 'Compliance' : category === 'type-golden' ? 'Golden Config' : 'Critical Golden Config'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Customer Filter */}
        {availableCustomers.length > 1 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="customer-select" className="text-sm font-medium">
              Customer
            </Label>
            <Select value={customerFilter} onValueChange={onCustomerChange}>
              <SelectTrigger id="customer-select" className="w-[200px]">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {availableCustomers.map((customer) => (
                  <SelectItem key={customer.tenant_id} value={customer.tenant_id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
