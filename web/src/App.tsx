import { useState } from 'react'
import ScanForm from './components/ScanForm'
import FindingsTable from './components/FindingsTable'
import { Header } from './components/Header'
import ResourcesModal from './components/ResourcesModal'
import { Finding } from './api'

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
  const [findings, setFindings] = useState<Finding[]>([])
  const [tenantId, setTenantId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [scanStats, setScanStats] = useState<{ resources: number; findings: number } | null>(null)
  const [showResourcesModal, setShowResourcesModal] = useState(false)
  const [snapshotKey, setSnapshotKey] = useState<string>('')

  const handleScanComplete = (newFindings: Finding[], stats: { resources: number; findings: number }, tenant: string, snapshot: string) => {
    setFindings(newFindings)
    setScanStats(stats)
    setTenantId(tenant)
    setSnapshotKey(snapshot)
  }

  const handleOpenResourcesModal = () => {
    if (snapshotKey && tenantId) {
      setShowResourcesModal(true)
    }
  }

  const handleCloseResourcesModal = () => {
    setShowResourcesModal(false)
  }

  return (
    <div className="relative min-h-screen bg-[#0C1A1A] overflow-x-hidden">
      <SphereBackground />
      <GeometricFooter />
      
      <div className="relative z-10">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="px-6 md:px-12 lg:px-24 py-16 md:py-24">
            <div className="max-w-7xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-neutral-100 tracking-tighter mb-6">
                Admin Portal
              </h1>
              <p className="text-lg md:text-xl text-neutral-400 max-w-3xl mx-auto mb-8">
                Run drift detection scans and analyze findings across customer AWS accounts.
              </p>
            </div>
          </section>

          {/* Main Content Section */}
          <section className="px-6 md:px-12 lg:px-24 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <ScanForm onScanComplete={handleScanComplete} onLoadingChange={setLoading} />
                </div>

                <div className="lg:col-span-2">
                  {scanStats && (
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div 
                        className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm cursor-pointer hover:border-cyan-500 transition-colors"
                        onClick={handleOpenResourcesModal}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleOpenResourcesModal()
                          }
                        }}
                        aria-label={`View ${scanStats.resources} scanned resources`}
                      >
                        <div className="text-sm text-neutral-400 mb-2 font-mono-custom">Resources Scanned</div>
                        <div className="text-4xl font-bold text-cyan-400">{scanStats.resources}</div>
                      </div>
                      <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm">
                        <div className="text-sm text-neutral-400 mb-2 font-mono-custom">Findings</div>
                        <div className="text-4xl font-bold text-red-400">{scanStats.findings}</div>
                      </div>
                    </div>
                  )}

                  <FindingsTable 
                    findings={findings} 
                    tenantId={tenantId} 
                    loading={loading}
                  />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Resources Modal */}
      <ResourcesModal
        isOpen={showResourcesModal}
        onClose={handleCloseResourcesModal}
        tenantId={tenantId}
        snapshotKey={snapshotKey}
        totalCount={scanStats?.resources || 0}
      />
    </div>
  )
}

export default App
