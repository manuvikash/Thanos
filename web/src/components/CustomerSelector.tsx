import { useState, useEffect } from 'react'
import { getCustomers, Customer } from '../api'

interface CustomerSelectorProps {
  onCustomerSelect: (customer: Customer | null) => void
  selectedCustomer: Customer | null
}

export default function CustomerSelector({ onCustomerSelect, selectedCustomer }: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tenantId = e.target.value
    if (tenantId === '') {
      onCustomerSelect(null)
    } else {
      const customer = customers.find(c => c.tenant_id === tenantId)
      if (customer) {
        onCustomerSelect(customer)
      }
    }
  }

  if (loading) {
    return (
      <div className="mb-4 p-4 bg-card border rounded-lg backdrop-blur-sm">
        <div className="text-muted-foreground text-sm">Loading customers...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-4 p-4 bg-card border rounded-lg backdrop-blur-sm">
        <div className="text-destructive text-sm mb-2">{error}</div>
        <button
          onClick={fetchCustomers}
          className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="mb-4 p-4 bg-card border rounded-lg backdrop-blur-sm">
        <div className="text-muted-foreground text-sm">No customers registered yet. Use manual entry below.</div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-foreground mb-2">
        Select Customer (Optional)
      </label>
      <select
        value={selectedCustomer?.tenant_id || ''}
        onChange={handleChange}
        className="w-full px-4 py-3 bg-input border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
      >
        <option value="">-- Manual Entry --</option>
        {customers.map(customer => (
          <option key={customer.tenant_id} value={customer.tenant_id}>
            {customer.customer_name}
          </option>
        ))}
      </select>
    </div>
  )
}
