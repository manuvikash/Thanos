import { useState, useEffect } from 'react'
import { SavedTenant, getSavedTenants, deleteTenant, parseUrlParams } from '../utils/storage'
import { TenantSelect } from './shared/TenantSelect'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Label } from './ui/label'
import { Trash2 } from 'lucide-react'

interface TenantSelectorProps {
  tenants?: SavedTenant[]
  onSelect: (tenant: SavedTenant) => void
  onDelete?: (tenantId: string) => void
  selectedTenant?: SavedTenant | null
}

export default function TenantSelector({ 
  tenants: externalTenants, 
  onSelect, 
  onDelete,
  selectedTenant: externalSelectedTenant 
}: TenantSelectorProps) {
  const [tenants, setTenants] = useState<SavedTenant[]>(externalTenants || [])
  const [selectedTenant, setSelectedTenant] = useState<SavedTenant | null>(externalSelectedTenant || null)

  // Load tenants from localStorage if not provided
  useEffect(() => {
    if (!externalTenants) {
      const savedTenants = getSavedTenants()
      setTenants(savedTenants)
      
      // Check for URL parameters
      const urlParams = parseUrlParams()
      if (urlParams && savedTenants.length > 0) {
        const matchingTenant = savedTenants.find(t => 
          t.id === urlParams.id || t.roleArn === urlParams.roleArn
        )
        if (matchingTenant) {
          setSelectedTenant(matchingTenant)
        }
      }
    }
  }, [externalTenants])

  // Update internal state when external props change
  useEffect(() => {
    if (externalTenants) {
      setTenants(externalTenants)
    }
  }, [externalTenants])

  useEffect(() => {
    if (externalSelectedTenant !== undefined) {
      setSelectedTenant(externalSelectedTenant)
    }
  }, [externalSelectedTenant])

  const handleSelect = (tenant: SavedTenant) => {
    setSelectedTenant(tenant)
    onSelect(tenant)
  }

  const handleDelete = (tenantId: string) => {
    if (onDelete) {
      onDelete(tenantId)
    } else {
      deleteTenant(tenantId)
      const updatedTenants = getSavedTenants()
      setTenants(updatedTenants)
      if (selectedTenant?.id === tenantId) {
        setSelectedTenant(null)
      }
    }
  }

  if (tenants.length === 0) return null

  return (
    <div className="mb-4 space-y-3">
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Recent Tenants
        </Label>
        <TenantSelect
          tenants={tenants}
          selectedTenant={selectedTenant}
          onSelect={handleSelect}
          placeholder="Select a tenant..."
          className="w-full"
        />
      </div>

      {selectedTenant && (
        <div className="p-3 bg-card border border-border rounded-md space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{selectedTenant.name || selectedTenant.id}</span>
                <Badge variant="secondary" className="text-xs">
                  {selectedTenant.accountId}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Role:</span> {selectedTenant.roleArn}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Regions:</span>{' '}
                {selectedTenant.regions.slice(0, 3).join(', ')}
                {selectedTenant.regions.length > 3 && ` +${selectedTenant.regions.length - 3} more`}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(selectedTenant.id)}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete tenant"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
