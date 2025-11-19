import { RegionSelect, AWS_REGIONS } from './shared/RegionSelect'
import { Label } from './ui/label'
import { Button } from './ui/button'

interface RegionSelectorProps {
  selectedRegions: string[]
  onChange: (regions: string[]) => void
}

export default function RegionSelector({ selectedRegions, onChange }: RegionSelectorProps) {
  const selectAll = () => {
    onChange(AWS_REGIONS.map(r => r.id))
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Regions ({selectedRegions.length} selected)
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAll}
            className="h-7 text-xs"
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAll}
            className="h-7 text-xs"
          >
            Clear All
          </Button>
        </div>
      </div>
      
      <RegionSelect
        selectedRegions={selectedRegions}
        onChange={onChange}
        placeholder="Select regions..."
        className="w-full"
      />
    </div>
  )
}
