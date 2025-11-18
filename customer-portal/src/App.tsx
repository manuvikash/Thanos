import { useState } from 'react'
import RegistrationForm from './components/RegistrationForm'
import { Header } from './components/Header'
import FeatureCard from './components/FeatureCard'
import { CloudIcon } from './components/icons/CloudIcon'
import { ShieldIcon } from './components/icons/ShieldIcon'
import { CostIcon } from './components/icons/CostIcon'

// Background decorative component - gradient sphere in top-right
const SphereBackground = () => {
  return (
    <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] pointer-events-none z-0 opacity-5" aria-hidden="true">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="sphereGradient" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#0C1A1A" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#sphereGradient)" fillOpacity="0.2" />
        <g stroke="#E5E7EB" strokeWidth="0.15">
          {[...Array(12)].map((_, i) => (
            <ellipse key={`h-${i}`} cx="50" cy="50" rx={50} ry={(i * 50) / 12} fill="none" />
          ))}
          {[...Array(12)].map((_, i) => (
            <ellipse key={`v-${i}`} cx="50" cy="50" rx={(i * 50) / 12} ry={50} fill="none" />
          ))}
        </g>
      </svg>
    </div>
  )
}

// Background decorative component - geometric shapes at bottom
const GeometricFooter = () => {
  return (
    <div className="absolute bottom-0 left-0 w-full h-32 md:h-40 opacity-5 pointer-events-none z-0">
      <svg
        viewBox="0 0 1200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Layered geometric shapes */}
        <path
          d="M0 80 L300 40 L600 100 L900 60 L1200 90 L1200 160 L0 160 Z"
          fill="#8F9779"
          opacity="0.4"
        />
        <path
          d="M0 100 L400 70 L800 110 L1200 80 L1200 160 L0 160 Z"
          fill="#8F9779"
          opacity="0.3"
        />
        <path
          d="M0 120 L500 90 L1000 130 L1200 100 L1200 160 L0 160 Z"
          fill="#8F9779"
          opacity="0.2"
        />
      </svg>
    </div>
  )
}

function App() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSuccess = (message: string) => {
    setSuccessMessage(message)
    setErrorMessage(null)
    // Auto-clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000)
  }

  const handleError = (error: string) => {
    setErrorMessage(error)
    setSuccessMessage(null)
    // Auto-clear error message after 5 seconds
    setTimeout(() => setErrorMessage(null), 5000)
  }

  const scrollToForm = () => {
    const formElement = document.getElementById('customer-form')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="relative min-h-screen bg-[#0C1A1A]">
      {/* Background decorative elements */}
      <SphereBackground />
      <GeometricFooter />
      
      {/* Main content with higher z-index */}
      <div className="relative z-10">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="px-6 md:px-12 lg:px-24 py-16 md:py-24">
            <div className="max-w-7xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-neutral-100 tracking-tighter mb-6">
                Detect AWS Drift. Instantly.
              </h1>
              <p className="text-lg md:text-xl text-neutral-400 max-w-3xl mx-auto mb-8">
                Monitor your AWS infrastructure for configuration drift in real-time. 
                Ensure compliance, security, and consistency across all your cloud resources.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={scrollToForm}
                  className="bg-neutral-100 text-[#0C1A1A] font-mono-custom px-8 py-3 rounded-md hover:bg-neutral-200 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0C1A1A]"
                  aria-label="Scroll to customer registration form"
                >
                  Start Onboarding
                </button>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="px-6 md:px-12 lg:px-24 py-16">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <FeatureCard
                  icon={<CloudIcon />}
                  title="Real-time Detection"
                  description="Unparalleled, real-time drift detection across your entire AWS infrastructure. Stay ahead of configuration changes."
                />
                <FeatureCard
                  icon={<ShieldIcon />}
                  title="Private and Secure"
                  description="Your data stays in your AWS account. We use read-only access with minimal permissions for maximum security."
                />
                <FeatureCard
                  icon={<CostIcon />}
                  title="Cost Effective"
                  description="Pay only for what you use. No upfront costs, no hidden fees. Scale monitoring as your infrastructure grows."
                />
              </div>
            </div>
          </section>

          {/* Registration Form Section */}
          <section id="customer-form" className="px-6 md:px-12 lg:px-24 py-16">
            <div className="max-w-7xl mx-auto">
              {/* Instructions Section */}
              <div className="max-w-3xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-100 text-center mb-8">
                  Getting Started
                </h2>
                
                {/* Step 1 */}
                <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 md:p-8 backdrop-blur-sm mb-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
                      <span className="text-cyan-400 font-mono-custom font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-neutral-100 mb-3">
                        Prepare Your AWS Account
                      </h3>
                      <p className="text-neutral-400 mb-4">
                        Before registering, you need to set up the required IAM role in your AWS account.
                      </p>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <span className="text-cyan-400 flex-shrink-0 leading-5">•</span>
                          <p className="text-neutral-300 text-sm leading-5">
                            Deploy the CloudFormation template to create the necessary IAM role
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-cyan-400 flex-shrink-0 leading-5">•</span>
                          <p className="text-neutral-300 text-sm leading-5">
                            Note down the Role ARN from the CloudFormation stack outputs
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-cyan-400 flex-shrink-0 leading-5">•</span>
                          <p className="text-neutral-300 text-sm leading-5">
                            Ensure you have your 12-digit AWS Account ID ready
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-cyan-400 flex-shrink-0 leading-5">•</span>
                          <p className="text-neutral-300 text-sm leading-5">
                            Identify which AWS regions you want to monitor for drift
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 md:p-8 backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
                      <span className="text-cyan-400 font-mono-custom font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-neutral-100 mb-3">
                        Complete Registration Form
                      </h3>
                      <p className="text-neutral-400">
                        Fill out the form below with your organization details and the IAM role information from Step 1. Once submitted, your account will be ready for drift detection monitoring.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Success/Error Messages */}
              {successMessage && (
                <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-md text-green-300 max-w-3xl mx-auto text-center" role="alert" aria-live="polite">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
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
                <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-md text-red-300 max-w-3xl mx-auto text-center" role="alert" aria-live="assertive">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
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

              <RegistrationForm onSuccess={handleSuccess} onError={handleError} />
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
