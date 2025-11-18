import { useState } from 'react'
import { Header } from './components/Header'
import ResourcesModal from './components/ResourcesModal'
import { Sidebar } from './components/Sidebar'
import { MainLayout } from './components/MainLayout'
import { ContentArea } from './components/ContentArea'
import { Finding } from './api'

function App() {
  // View state
  const [currentView, setCurrentView] = useState<'dashboard' | 'findings'>('dashboard')
  const [sidebarCollapsed] = useState(false)

  // Existing state management
  const [findings, setFindings] = useState<Finding[]>([])
  const [tenantId, setTenantId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [scanStats, setScanStats] = useState<{ resources: number; findings: number } | null>(null)
  const [showResourcesModal, setShowResourcesModal] = useState(false)
  const [snapshotKey, setSnapshotKey] = useState<string>('')
  
  // Filter state for FindingsTable persistence
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('')

  const handleNavigate = (view: string) => {
    setCurrentView(view as 'dashboard' | 'findings')
  }

  const handleScanComplete = (newFindings: Finding[], stats: { resources: number; findings: number }, tenant: string, snapshot: string) => {
    setFindings(newFindings)
    setScanStats(stats)
    setTenantId(tenant)
    setSnapshotKey(snapshot)
    handleNavigate('dashboard')
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
    <>
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate}
        isCollapsed={sidebarCollapsed}
      />
      
      <MainLayout sidebarCollapsed={sidebarCollapsed}>
        <Header />
        
        <main>
          <ContentArea
            currentView={currentView}
            tenantId={tenantId}
            findings={findings}
            scanStats={scanStats}
            loading={loading}
            snapshotKey={snapshotKey}
            onOpenResourcesModal={handleOpenResourcesModal}
            onScanComplete={handleScanComplete}
            onLoadingChange={setLoading}
            severityFilter={severityFilter}
            resourceTypeFilter={resourceTypeFilter}
            onSeverityFilterChange={setSeverityFilter}
            onResourceTypeFilterChange={setResourceTypeFilter}
          />
        </main>
      </MainLayout>

      {/* Resources Modal */}
      <ResourcesModal
        isOpen={showResourcesModal}
        onClose={handleCloseResourcesModal}
        tenantId={tenantId}
        snapshotKey={snapshotKey}
        totalCount={scanStats?.resources || 0}
      />
    </>
  )
}

export default App
