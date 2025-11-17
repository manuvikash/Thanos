import { SavedTenant } from '../utils/storage'

interface TenantSelectorProps {
  tenants: SavedTenant[]
  onSelect: (tenant: SavedTenant) => void
  onDelete: (tenantId: string) => void
}

export default function TenantSelector({ tenants, onSelect, onDelete }: TenantSelectorProps) {
  if (tenants.length === 0) return null

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Recent Tenants
      </label>
      <div className="space-y-2">
        {tenants.map(tenant => (
          <div
            key={tenant.id}
            className="flex items-center justify-between bg-gray-700 border border-gray-600 rounded-md p-3 hover:bg-gray-650"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-100">{tenant.name || tenant.id}</span>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                  {tenant.accountId}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1 truncate">
                {tenant.regions.slice(0, 3).join(', ')}
                {tenant.regions.length > 3 && ` +${tenant.regions.length - 3} more`}
              </div>
            </div>
            <div className="flex gap-2 ml-2">
              <button
                type="button"
                onClick={() => onSelect(tenant)}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition"
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => onDelete(tenant.id)}
                className="px-2 py-1 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition"
                title="Delete"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
