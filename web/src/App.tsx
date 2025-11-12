import { useState } from 'react'
import ScanForm from './components/ScanForm'
import FindingsTable from './components/FindingsTable'
import { Finding } from './api'

function App() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [tenantId, setTenantId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [scanStats, setScanStats] = useState<{ resources: number; findings: number } | null>(null)

  const handleScanComplete = (newFindings: Finding[], stats: { resources: number; findings: number }, tenant: string) => {
    setFindings(newFindings)
    setScanStats(stats)
    setTenantId(tenant)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">Thanos</h1>
          <p className="text-gray-400">AWS Configuration Drift Detector</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <ScanForm onScanComplete={handleScanComplete} onLoadingChange={setLoading} />
          </div>

          <div className="lg:col-span-2">
            {scanStats && (
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-1">Resources Scanned</div>
                  <div className="text-3xl font-bold text-blue-400">{scanStats.resources}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-1">Findings</div>
                  <div className="text-3xl font-bold text-red-400">{scanStats.findings}</div>
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
    </div>
  )
}

export default App
