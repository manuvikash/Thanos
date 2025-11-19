import { useState, useRef, useEffect } from 'react'

interface FilterControlsProps {
  severityFilter: string[]
  resourceTypeFilter: string
  availableResourceTypes: string[]
  onSeverityChange: (severities: string[]) => void
  onResourceTypeChange: (type: string) => void
  onClearFilters: () => void
}

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export default function FilterControls({
  severityFilter,
  resourceTypeFilter,
  availableResourceTypes,
  onSeverityChange,
  onResourceTypeChange,
  onClearFilters,
}: FilterControlsProps) {
  const [severityDropdownOpen, setSeverityDropdownOpen] = useState(false)
  const [resourceTypeDropdownOpen, setResourceTypeDropdownOpen] = useState(false)
  
  const severityDropdownRef = useRef<HTMLDivElement>(null)
  const resourceTypeDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (severityDropdownRef.current && !severityDropdownRef.current.contains(event.target as Node)) {
        setSeverityDropdownOpen(false)
      }
      if (resourceTypeDropdownRef.current && !resourceTypeDropdownRef.current.contains(event.target as Node)) {
        setResourceTypeDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSeverityToggle = (severity: string) => {
    if (severityFilter.includes(severity)) {
      onSeverityChange(severityFilter.filter(s => s !== severity))
    } else {
      onSeverityChange([...severityFilter, severity])
    }
  }

  const handleResourceTypeSelect = (type: string) => {
    onResourceTypeChange(type)
    setResourceTypeDropdownOpen(false)
  }

  const hasActiveFilters = severityFilter.length > 0 || resourceTypeFilter !== ''

  const getSeverityButtonLabel = () => {
    if (severityFilter.length === 0) return 'Severity'
    if (severityFilter.length === 1) return `Severity: ${severityFilter[0]}`
    return `Severity (${severityFilter.length})`
  }

  const getResourceTypeButtonLabel = () => {
    return resourceTypeFilter || 'All Resource Types'
  }

  return (
    <div className="px-4 sm:px-6 py-4 border-b">
      {/* Mobile: Stacked layout, Tablet+: Horizontal layout with wrapping */}
      <div className="flex flex-col md:flex-row md:items-center md:flex-wrap gap-3">
        <span className="text-sm text-muted-foreground font-medium">Filters:</span>
        
        {/* Filter controls container - allows wrapping on tablet */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 flex-1">
          {/* Severity Filter Dropdown */}
          <div className="relative sm:flex-shrink-0" ref={severityDropdownRef}>
            <button
              onClick={() => setSeverityDropdownOpen(!severityDropdownOpen)}
              className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-2 sm:min-w-[160px] justify-between ${
                severityFilter.length > 0
                  ? 'bg-accent border-2 border-primary text-primary'
                  : 'bg-secondary border text-secondary-foreground hover:bg-secondary/80'
              }`}
              aria-label="Filter by severity"
            >
              <span>{getSeverityButtonLabel()}</span>
              <svg
                className={`w-4 h-4 transition-transform ${severityDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {severityDropdownOpen && (
              <div className="absolute z-10 mt-2 w-full sm:w-56 bg-popover border rounded-md shadow-lg">
                <div className="py-2">
                  {SEVERITY_OPTIONS.map((severity) => (
                    <label
                      key={severity}
                      className="flex items-center px-4 py-2 hover:bg-accent cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={severityFilter.includes(severity)}
                        onChange={() => handleSeverityToggle(severity)}
                        className="w-4 h-4 text-primary bg-input border rounded focus:ring-ring focus:ring-2"
                      />
                      <span className="ml-3 text-sm text-popover-foreground">{severity}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Resource Type Filter Dropdown */}
          <div className="relative sm:flex-shrink-0" ref={resourceTypeDropdownRef}>
            <button
              onClick={() => setResourceTypeDropdownOpen(!resourceTypeDropdownOpen)}
              className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-2 sm:min-w-[180px] justify-between ${
                resourceTypeFilter
                  ? 'bg-accent border-2 border-primary text-primary'
                  : 'bg-secondary border text-secondary-foreground hover:bg-secondary/80'
              }`}
              aria-label="Filter by resource type"
            >
              <span className="truncate">{getResourceTypeButtonLabel()}</span>
              <svg
                className={`w-4 h-4 flex-shrink-0 transition-transform ${resourceTypeDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {resourceTypeDropdownOpen && (
              <div className="absolute z-10 mt-2 w-full sm:w-56 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
                <div className="py-2">
                  <button
                    onClick={() => handleResourceTypeSelect('')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      !resourceTypeFilter
                        ? 'bg-accent text-primary'
                        : 'text-popover-foreground hover:bg-accent'
                    }`}
                  >
                    All Resource Types
                  </button>
                  {availableResourceTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => handleResourceTypeSelect(type)}
                      className={`w-full text-left px-4 py-2 text-sm font-mono transition-colors ${
                        resourceTypeFilter === type
                          ? 'bg-accent text-primary'
                          : 'text-popover-foreground hover:bg-accent'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring sm:flex-shrink-0"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
