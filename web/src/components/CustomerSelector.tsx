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
      <div className="mb-4 p-4 bg-[#102020]/50 border border-neutral-800 rounded-lg backdrop-blur-sm">
        <div className="text-neutral-400 text-sm">Loading customers...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-4 p-4 bg-[#102020]/50 border border-neutral-800 rounded-lg backdrop-blur-sm">
        <div className="text-red-400 text-sm mb-2">{error}</div>
        <button
          onClick={fetchCustomers}
          className="text-sm bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="mb-4 p-4 bg-[#102020]/50 border border-neutral-800 rounded-lg backdrop-blur-sm">
        <div className="text-neutral-400 text-sm">No customers registered yet. Use manual entry below.</div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-neutral-300 mb-2">
        Select Customer (Optional)
      </label>
      <select
        value={selectedCustomer?.tenant_id || ''}
        onChange={handleChange}
        className="w-full px-4 py-3 bg-[#0C1A1A] border border-neutral-700 rounded-md text-neutral-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
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
