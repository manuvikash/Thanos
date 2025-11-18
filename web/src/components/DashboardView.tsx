import { FindingsDashboard } from './FindingsDashboard'
import { DashboardErrorBoundary } from './DashboardErrorBoundary'
import ScanForm from './ScanForm'
import { Finding } from '../api'

interface DashboardViewProps {
  tenantId: string
  scanStats: { resources: number; findings: number } | null
  snapshotKey: string
  onOpenResourcesModal: () => void
  onScanComplete: (findings: Finding[], stats: { resources: number; findings: number }, tenantId: string, snapshotKey: string) => void
  onLoadingChange: (loading: boolean) => void
}

export function DashboardView({
  tenantId,
  scanStats,
  onOpenResourcesModal,
  onScanComplete,
  onLoadingChange,
}: DashboardViewProps) {
  return (
    <>
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
              <ScanForm onScanComplete={onScanComplete} onLoadingChange={onLoadingChange} />
            </div>

            <div className="lg:col-span-2">
              {/* Scan Statistics Cards */}
              {scanStats && (
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm cursor-pointer hover:border-cyan-500 transition-colors"
                    onClick={onOpenResourcesModal}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onOpenResourcesModal()
                      }
                    }}
                    aria-label={`View ${scanStats.resources} scanned resources`}
                  >
                    <div className="text-sm text-neutral-400 mb-2 font-mono-custom">
                      Resources Scanned
                    </div>
                    <div className="text-4xl font-bold text-cyan-400">{scanStats.resources}</div>
                  </div>
                  <div className="bg-[#102020]/50 border border-neutral-800 rounded-lg p-6 backdrop-blur-sm">
                    <div className="text-sm text-neutral-400 mb-2 font-mono-custom">Findings</div>
                    <div className="text-4xl font-bold text-red-400">{scanStats.findings}</div>
                  </div>
                </div>
              )}

              {/* Dashboard with metrics and visualizations */}
              <DashboardErrorBoundary>
                <FindingsDashboard tenantId={tenantId} />
              </DashboardErrorBoundary>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
