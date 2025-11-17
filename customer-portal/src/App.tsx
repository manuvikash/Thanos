import { useState } from 'react'
import RegistrationForm from './components/RegistrationForm'

function App() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSuccess = (message: string) => {
    setSuccessMessage(message)
    setErrorMessage(null)
    // Auto-clear success message after 10 seconds
    setTimeout(() => setSuccessMessage(null), 10000)
  }

  const handleError = (error: string) => {
    setErrorMessage(error)
    setSuccessMessage(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">
            Thanos Customer Portal
          </h1>
          <p className="text-gray-400">
            Register your AWS account for configuration drift detection
          </p>
        </div>

        {/* Instructions Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-semibold text-blue-400 mb-4">
            Getting Started
          </h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold text-gray-200 mb-2">
                Step 1: Deploy CloudFormation Stack
              </h3>
              <p className="text-sm mb-2">
                Before registering, you need to deploy the CloudFormation
                template in your AWS account to create the required IAM role.
              </p>
              <a
                href="https://github.com/your-repo/Thanos/blob/main/cfn/customer-onboarding-role.yaml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition duration-200"
              >
                View CloudFormation Template
              </a>
              <div className="mt-3 p-3 bg-gray-700 rounded text-sm">
                <p className="font-mono text-gray-300">
                  aws cloudformation create-stack \<br />
                  &nbsp;&nbsp;--stack-name thanos-audit-role \<br />
                  &nbsp;&nbsp;--template-body
                  file://customer-onboarding-role.yaml \<br />
                  &nbsp;&nbsp;--capabilities CAPABILITY_NAMED_IAM
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-200 mb-2">
                Step 2: Gather Required Information
              </h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>
                  <strong>Tenant ID:</strong> A unique identifier for your
                  organization (e.g., "acme-corp")
                </li>
                <li>
                  <strong>Customer Name:</strong> Your organization's display
                  name
                </li>
                <li>
                  <strong>Role ARN:</strong> The IAM role ARN from the
                  CloudFormation stack outputs
                </li>
                <li>
                  <strong>Account ID:</strong> Your 12-digit AWS account ID
                </li>
                <li>
                  <strong>Regions:</strong> AWS regions you want to scan for
                  drift
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-200 mb-2">
                Step 3: Complete Registration Form
              </h3>
              <p className="text-sm">
                Fill out the registration form below with the information from
                your CloudFormation deployment. Once registered, administrators
                will be able to run scans on your AWS account.
              </p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-md text-green-200">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-semibold">Success!</p>
                <p className="text-sm mt-1">{successMessage}</p>
                <p className="text-sm mt-2">
                  Your account is now registered. Administrators can now select
                  your organization from the Admin Portal to run scans.
                </p>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-md text-red-200">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <RegistrationForm onSuccess={handleSuccess} onError={handleError} />

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Need help? Contact your Thanos administrator or refer to the{' '}
            <a
              href="https://github.com/your-repo/Thanos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              documentation
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
