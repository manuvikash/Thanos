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
  const [regions, setRegions] = useState('')
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
    const regionList = regions
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
    
    if (regionList.length === 0) {
      errors.regions = 'Please enter at least one region'
    } else {
      // Validate each region against the AWS_REGIONS list
      const invalidRegions = regionList.filter(
        (r) => !AWS_REGIONS.includes(r)
      )
      if (invalidRegions.length > 0) {
        errors.regions = `Invalid region(s): ${invalidRegions.join(', ')}`
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationErrors({})

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Parse regions from comma-separated string
      const regionList = regions
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length > 0)

      await registerCustomer({
        tenant_id: tenantId,
        customer_name: customerName,
        role_arn: roleArn,
        account_id: accountId,
        regions: regionList,
      })

      onSuccess(
        `Registration successful! Your customer account "${customerName}" has been registered.`
      )

      // Reset form
      setTenantId('')
      setCustomerName('')
      setRoleArn('')
      setAccountId('')
      setRegions('')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto bg-[#102020]/50 border border-neutral-800 rounded-lg p-8 md:p-12 backdrop-blur-sm">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-neutral-100 tracking-tighter">
          Onboard New Customer
        </h2>
        <p className="text-neutral-400 mt-2">
          Enter the details below to provision a new customer tenant.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="tenant-id" className="block text-sm font-medium text-neutral-300 mb-2">
            Tenant ID *
          </label>
          <input
            id="tenant-id"
            type="text"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="w-full bg-[#0C1A1A] border border-neutral-700 rounded-md px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="e.g., acme-corp-123"
            required
            aria-describedby="tenant-id-help tenant-id-error"
            aria-invalid={!!validationErrors.tenantId}
          />
          {validationErrors.tenantId && (
            <p id="tenant-id-error" className="mt-1 text-sm text-red-400" role="alert">
              {validationErrors.tenantId}
            </p>
          )}
          <p id="tenant-id-help" className="mt-1 text-xs text-neutral-500">
            3-50 characters, alphanumeric and hyphens only
          </p>
        </div>

        <div>
          <label htmlFor="customer-name" className="block text-sm font-medium text-neutral-300 mb-2">
            Customer Name *
          </label>
          <input
            id="customer-name"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full bg-[#0C1A1A] border border-neutral-700 rounded-md px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Acme Corporation"
            required
            aria-describedby={validationErrors.customerName ? "customer-name-error" : undefined}
            aria-invalid={!!validationErrors.customerName}
          />
          {validationErrors.customerName && (
            <p id="customer-name-error" className="mt-1 text-sm text-red-400" role="alert">
              {validationErrors.customerName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="role-arn" className="block text-sm font-medium text-neutral-300 mb-2">
            Role ARN *
          </label>
          <input
            id="role-arn"
            type="text"
            value={roleArn}
            onChange={(e) => setRoleArn(e.target.value)}
            className="w-full bg-[#0C1A1A] border border-neutral-700 rounded-md px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="arn:aws:iam::123456789012:role/CloudGoldenGuardAuditRole"
            required
            aria-describedby="role-arn-help role-arn-error"
            aria-invalid={!!validationErrors.roleArn}
          />
          {validationErrors.roleArn && (
            <p id="role-arn-error" className="mt-1 text-sm text-red-400" role="alert">
              {validationErrors.roleArn}
            </p>
          )}
          <p id="role-arn-help" className="mt-1 text-xs text-neutral-500">
            The IAM role ARN from your CloudFormation deployment
          </p>
        </div>

        <div>
          <label htmlFor="account-id" className="block text-sm font-medium text-neutral-300 mb-2">
            Account ID *
          </label>
          <input
            id="account-id"
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full bg-[#0C1A1A] border border-neutral-700 rounded-md px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="123456789012"
            required
            aria-describedby="account-id-help account-id-error"
            aria-invalid={!!validationErrors.accountId}
          />
          {validationErrors.accountId && (
            <p id="account-id-error" className="mt-1 text-sm text-red-400" role="alert">
              {validationErrors.accountId}
            </p>
          )}
          <p id="account-id-help" className="mt-1 text-xs text-neutral-500">12-digit AWS account ID</p>
        </div>

        <div>
          <label htmlFor="regions" className="block text-sm font-medium text-neutral-300 mb-2">
            AWS Regions *
          </label>
          <input
            id="regions"
            type="text"
            value={regions}
            onChange={(e) => setRegions(e.target.value)}
            className="w-full bg-[#0C1A1A] border border-neutral-700 rounded-md px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="us-east-1, us-west-2, eu-central-1"
            required
            aria-describedby="regions-help regions-error"
            aria-invalid={!!validationErrors.regions}
          />
          {validationErrors.regions && (
            <p id="regions-error" className="mt-1 text-sm text-red-400" role="alert">
              {validationErrors.regions}
            </p>
          )}
          <p id="regions-help" className="mt-1 text-xs text-neutral-500">
            Enter AWS regions, separated by commas. Valid regions: {AWS_REGIONS.join(', ')}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-neutral-100 hover:bg-neutral-200 disabled:bg-neutral-400 disabled:cursor-not-allowed text-[#0C1A1A] font-semibold py-3 px-4 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#102020] font-mono-custom flex items-center justify-center gap-2"
          aria-busy={isSubmitting}
        >
          {isSubmitting && (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          {isSubmitting ? 'Registering...' : 'Register Customer'}
        </button>
      </form>
    </div>
  )
}
