import { Link } from 'react-router-dom'
import { ROUTES } from '../routes'
import { CloudIcon } from '../components/icons/CloudIcon'
import { DashboardIcon } from '../components/icons/DashboardIcon'
import { RegistrationHeader } from '../components/registration/RegistrationHeader'

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

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      {/* Background decorative elements */}
      <SphereBackground />
      <GeometricFooter />

      {/* Main content with higher z-index */}
      <div className="relative z-10 flex-1 flex flex-col">
        <RegistrationHeader />

        <main className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 lg:px-24 pb-24">
          <div className="max-w-4xl mx-auto w-full text-center space-y-12">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tighter leading-tight">
                Welcome to <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
                  Thanos
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Your centralized platform for cloud security, compliance monitoring, and resource management.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Onboard Resources Card */}
              <Link
                to={ROUTES.REGISTER}
                className="group relative overflow-hidden bg-card border border-border hover:border-cyan-500/50 rounded-xl p-8 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(6,182,212,0.3)] text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform duration-300">
                    <CloudIcon />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground font-mono-custom mt-4">
                    Onboard Resources
                  </h2>
                  <p className="text-muted-foreground mt-4 flex-grow">
                    Register new customers and provision cloud resources across multiple regions.
                  </p>
                  <div className="pt-4 flex items-center text-cyan-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                    Get Started <span className="ml-2">→</span>
                  </div>
                </div>
              </Link>

              {/* Admin Dashboard Card */}
              <Link
                to={ROUTES.DASHBOARD}
                className="group relative overflow-hidden bg-card border border-border hover:border-teal-500/50 rounded-xl p-8 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(20,184,166,0.3)] text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform duration-300">
                    <DashboardIcon />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground font-mono-custom mt-4">
                    Admin Dashboard
                  </h2>
                  <p className="text-muted-foreground mt-4 flex-grow">
                    Monitor security findings, analyze metrics, and manage compliance rules.
                  </p>
                  <div className="pt-4 flex items-center text-teal-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                    View Dashboard <span className="ml-2">→</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </main>

        <footer className="border-t border-border bg-background py-8 px-6">
          <div className="max-w-7xl mx-auto text-center text-neutral-500 text-sm">
            © {new Date().getFullYear()} Cloud Golden Guard. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  )
}
