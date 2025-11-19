import { useState } from 'react'
import { ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export const AWS_REGIONS = [
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

interface RegionSelectProps {
  selectedRegions: string[]
  onChange: (regions: string[]) => void
  placeholder?: string
  className?: string
}

export function RegionSelect({
  selectedRegions,
  onChange,
  placeholder = 'Select regions...',
  className,
}: RegionSelectProps) {
  const [open, setOpen] = useState(false)

  const toggleRegion = (regionId: string) => {
    if (selectedRegions.includes(regionId)) {
      onChange(selectedRegions.filter((r) => r !== regionId))
    } else {
      onChange([...selectedRegions, regionId])
    }
  }

  const removeRegion = (regionId: string) => {
    onChange(selectedRegions.filter((r) => r !== regionId))
  }

  const getRegionName = (regionId: string) => {
    return AWS_REGIONS.find((r) => r.id === regionId)?.name || regionId
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">
              {selectedRegions.length === 0
                ? placeholder
                : `${selectedRegions.length} region${selectedRegions.length === 1 ? '' : 's'} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput placeholder="Search regions..." />
            <CommandEmpty>No region found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              {AWS_REGIONS.map((region) => (
                <CommandItem
                  key={region.id}
                  value={`${region.name} ${region.id}`}
                  onSelect={() => toggleRegion(region.id)}
                >
                  <Checkbox
                    checked={selectedRegions.includes(region.id)}
                    className="mr-2"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium truncate">{region.name}</span>
                    <span className="text-xs text-muted-foreground">{region.id}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedRegions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedRegions.map((regionId) => (
            <Badge key={regionId} variant="secondary" className="gap-1">
              <span className="truncate max-w-[200px]">{getRegionName(regionId)}</span>
              <button
                onClick={() => removeRegion(regionId)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
                aria-label={`Remove ${regionId}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
