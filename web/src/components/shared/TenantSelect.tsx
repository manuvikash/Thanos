import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { SavedTenant } from '@/utils/storage'

interface TenantSelectProps {
  tenants: SavedTenant[]
  selectedTenant: SavedTenant | null
  onSelect: (tenant: SavedTenant) => void
  placeholder?: string
  className?: string
}

export function TenantSelect({
  tenants,
  selectedTenant,
  onSelect,
  placeholder = 'Select tenant...',
  className,
}: TenantSelectProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-[300px] justify-between', className)}
        >
          <span className="truncate">
            {selectedTenant ? selectedTenant.name || selectedTenant.id : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search tenants..." />
          <CommandEmpty>No tenant found.</CommandEmpty>
          <CommandGroup>
            {tenants.map((tenant) => (
              <CommandItem
                key={tenant.id}
                value={tenant.name || tenant.id}
                onSelect={() => {
                  onSelect(tenant)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedTenant?.id === tenant.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium truncate">
                    {tenant.name || tenant.id}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {tenant.accountId}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
