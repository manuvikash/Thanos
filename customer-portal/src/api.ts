/**
 * API client for Customer Portal
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface CustomerRegistration {
  tenant_id: string
  customer_name: string
  role_arn: string
  account_id: string
  regions: string[]
}

export interface CustomerResponse {
  message: string
  customer: {
    tenant_id: string
    customer_name: string
    role_arn: string
    account_id: string
    regions: string[]
    created_at: string
    status: string
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }))
    
    // Handle specific error cases
    if (response.status === 409) {
      throw new Error(error.error || 'Customer with this Tenant ID already exists')
    }
    
    throw new Error(error.error || `HTTP ${response.status}: Registration failed`)
  }

  return response.json()
}

export async function registerCustomer(
  registration: CustomerRegistration
): Promise<CustomerResponse> {
  return fetchAPI<CustomerResponse>('/customers/register', {
    method: 'POST',
    body: JSON.stringify(registration),
  })
}
