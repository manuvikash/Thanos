import { useState, FormEvent } from 'react'
import { registerCustomer } from '../api'

interface RegistrationFormProps {
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-north-1',
  'ap-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ca-central-1',
  'sa-east-1',
]

export default function RegistrationForm({
  onSuccess,
  onError,
}: RegistrationFormProps) {
  const [tenantId, setTenantId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [roleArn, setRoleArn] = useState('')
  const [accountId, setAccountId] = useState('')
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string
  }>({})

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    // Validate tenant_id
    if (!tenantId || tenantId.length < 3 || tenantId.length > 50) {
      errors.tenantId = 'Tenant ID must be 3-50 characters'
    } else if (!/^[a-zA-Z0-9-]+$/.test(tenantId)) {
      errors.tenantId =
        'Tenant ID must contain only alphanumeric characters and hyphens'
    }

    // Validate customer_name
    if (!customerName || customerName.length < 1 || customerName.length > 100) {
      errors.customerName = 'Customer name must be 1-100 characters'
    }

    // Validate role_arn
    if (!/^arn:aws:iam::\d{12}:role\/.+$/.test(roleArn)) {
      errors.roleArn = 'Role ARN must be a valid IAM role ARN'
    }

    // Validate account_id
    if (!/^\d{12}$/.test(accountId)) {
      errors.accountId = 'Account ID must be a 12-digit number'
    }

    // Validate regions
    if (selectedRegions.length === 0) {
      errors.regions = 'Please select at least one region'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleRegionToggle = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationErrors({})

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await registerCustomer({
        tenant_id: tenantId,
        customer_name: customerName,
        role_arn: roleArn,
        account_id: accountId,
        regions: selectedRegions,
      })

      onSuccess(
        `Registration successful! Your customer account "${customerName}" has been registered.`
      )

      // Reset form
      setTenantId('')
      setCustomerName('')
      setRoleArn('')
      setAccountId('')
      setSelectedRegions([])
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-2xl font-semibold mb-4 text-blue-400">
        Customer Registration
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Tenant ID *
          </label>
          <input
            type="text"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="customer-123"
            required
          />
          {validationErrors.tenantId && (
            <p className="mt-1 text-sm text-red-400">
              {validationErrors.tenantId}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            3-50 characters, alphanumeric and hyphens only
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Customer Name *
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Acme Corporation"
            required
          />
          {validationErrors.customerName && (
            <p className="mt-1 text-sm text-red-400">
              {validationErrors.customerName}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Role ARN *
          </label>
          <input
            type="text"
            value={roleArn}
            onChange={(e) => setRoleArn(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="arn:aws:iam::123456789012:role/CloudGoldenGuardAuditRole"
            required
          />
          {validationErrors.roleArn && (
            <p className="mt-1 text-sm text-red-400">
              {validationErrors.roleArn}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            The IAM role ARN from your CloudFormation deployment
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Account ID *
          </label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123456789012"
            required
          />
          {validationErrors.accountId && (
            <p className="mt-1 text-sm text-red-400">
              {validationErrors.accountId}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">12-digit AWS account ID</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            AWS Regions * (select one or more)
          </label>
          <div className="bg-gray-700 border border-gray-600 rounded-md p-3 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {AWS_REGIONS.map((region) => (
                <label
                  key={region}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-600 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedRegions.includes(region)}
                    onChange={() => handleRegionToggle(region)}
                    className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-200">{region}</span>
                </label>
              ))}
            </div>
          </div>
          {validationErrors.regions && (
            <p className="mt-1 text-sm text-red-400">
              {validationErrors.regions}
            </p>
          )}
          {selectedRegions.length > 0 && (
            <p className="mt-2 text-xs text-gray-400">
              Selected: {selectedRegions.join(', ')}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isSubmitting ? 'Registering...' : 'Register Customer'}
        </button>
      </form>
    </div>
  )
}
