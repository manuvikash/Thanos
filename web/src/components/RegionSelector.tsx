import { useState } from 'react'

const AWS_REGIONS = [
  { id: 'us-east-1', name: 'US East (N. Virginia)' },
  { id: 'us-east-2', name: 'US East (Ohio)' },
  { id: 'us-west-1', name: 'US West (N. California)' },
  { id: 'us-west-2', name: 'US West (Oregon)' },
  { id: 'eu-west-1', name: 'Europe (Ireland)' },
  { id: 'eu-west-2', name: 'Europe (London)' },
  { id: 'eu-central-1', name: 'Europe (Frankfurt)' },
  { id: 'ap-south-1', name: 'Asia Pacific (Mumbai)' },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
  { id: 'ap-southeast-2', name: 'Asia Pacific (Sydney)' },
  { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)' },
  { id: 'ap-northeast-2', name: 'Asia Pacific (Seoul)' },
  { id: 'sa-east-1', name: 'South America (São Paulo)' },
  { id: 'ca-central-1', name: 'Canada (Central)' },
]

interface RegionSelectorProps {
  selectedRegions: string[]
  onChange: (regions: string[]) => void
}

export default function RegionSelector({ selectedRegions, onChange }: RegionSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleRegion = (regionId: string) => {
    if (selectedRegions.includes(regionId)) {
      onChange(selectedRegions.filter(r => r !== regionId))
    } else {
      onChange([...selectedRegions, regionId])
    }
  }

  const selectAll = () => {
    onChange(AWS_REGIONS.map(r => r.id))
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Regions ({selectedRegions.length} selected)
      </label>
      
      <div className="bg-gray-700 border border-gray-600 rounded-md">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 text-left text-gray-100 flex justify-between items-center"
        >
          <span className="truncate">
            {selectedRegions.length === 0 
              ? 'Select regions...' 
              : selectedRegions.slice(0, 3).join(', ') + (selectedRegions.length > 3 ? '...' : '')}
          </span>
          <svg 
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="border-t border-gray-600 p-2 max-h-64 overflow-y-auto">
            <div className="flex gap-2 mb-2 pb-2 border-b border-gray-600">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white"
              >
                Clear All
              </button>
            </div>
            
            {AWS_REGIONS.map(region => (
              <label
                key={region.id}
                className="flex items-center px-2 py-1.5 hover:bg-gray-600 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedRegions.includes(region.id)}
                  onChange={() => toggleRegion(region.id)}
                  className="mr-2 rounded"
                />
                <span className="text-sm text-gray-200">{region.name}</span>
                <span className="ml-auto text-xs text-gray-400">{region.id}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
