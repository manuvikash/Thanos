import { useState } from 'react'
import RegistrationForm from '../components/registration/RegistrationForm'
import { RegistrationHeader } from '../components/registration/RegistrationHeader'
import FeatureCard from '../components/registration/FeatureCard'
import { CloudIcon } from '../components/icons/CloudIcon'
import { ShieldIcon } from '../components/icons/ShieldIcon'
import { CostIcon } from '../components/icons/CostIcon'

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

export default function RegistrationPage() {
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
    <div className="relative min-h-screen bg-background">
      {/* Background decorative elements */}
      <SphereBackground />
      <GeometricFooter />

      {/* Main content with higher z-index */}
      <div className="relative z-10">
        <RegistrationHeader />

        <main className="px-6 md:px-12 lg:px-24 pb-24">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24 pt-12">
              <div className="space-y-8">
                <div className="inline-block px-4 py-1 rounded-full bg-muted border border-border text-muted-foreground text-sm font-mono-custom">
                  v1.0.0 Public Beta
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tighter leading-tight">
                  Secure Your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
                    Cloud Infrastructure
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                  Automated security scanning, compliance monitoring, and cost optimization for your AWS environment.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <button
                    onClick={scrollToForm}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-md transition duration-200 font-mono-custom"
                  >
                    Get Started
                  </button>
                  <a
                    href="https://github.com/manuvikash/thanos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-transparent border border-border hover:border-muted-foreground text-muted-foreground py-3 px-8 rounded-md transition duration-200 font-mono-custom"
                  >
                    View Documentation
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <FeatureCard
                  icon={<CloudIcon />}
                  title="Multi-Region Scanning"
                  description="Automatically discover and scan resources across all enabled AWS regions."
                />
                <FeatureCard
                  icon={<ShieldIcon />}
                  title="Security & Compliance"
                  description="Detect misconfigurations and security risks against industry best practices."
                />
                <FeatureCard
                  icon={<CostIcon />}
                  title="Resource Inventory"
                  description="Maintain a comprehensive inventory of your cloud assets and configurations."
                />
              </div>
            </div>

            <div id="customer-form" className="scroll-mt-24">
              {successMessage && (
                <div className="mb-8 p-4 bg-green-900/30 border border-green-800 rounded-md text-green-200 flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="mb-8 p-4 bg-red-900/30 border border-red-800 rounded-md text-red-200 flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errorMessage}
                </div>
              )}

              <RegistrationForm onSuccess={handleSuccess} onError={handleError} />
            </div>
          </div>
        </main>

        <footer className="border-t border-border bg-background py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Cloud Golden Guard. All rights reserved.
            </div>
            <div className="flex gap-8">
              <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
