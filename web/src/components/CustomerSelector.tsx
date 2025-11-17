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
      <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-gray-400 text-sm">Loading customers...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-red-400 text-sm mb-2">{error}</div>
        <button
          onClick={fetchCustomers}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded transition duration-200"
        >
          Retry
        </button>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-gray-400 text-sm">No customers registered yet. Use manual entry below.</div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Select Customer (Optional)
      </label>
      <select
        value={selectedCustomer?.tenant_id || ''}
        onChange={handleChange}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
