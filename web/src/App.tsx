import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Header } from './components/Header'
import ResourcesModal from './components/ResourcesModal'
import { Sidebar } from './components/Sidebar'
import { MainLayout } from './components/MainLayout'
import { ContentArea } from './components/ContentArea'
import { Toast } from './components/Toast'
import { InvalidRouteHandler } from './components/InvalidRouteHandler'
import { useToast } from './hooks/useToast'
import { Finding } from './api'
import { ROUTES } from './routes'

function App() {
  const [sidebarCollapsed] = useState(false)
  const { toasts, showToast, removeToast } = useToast()

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

  const handleScanComplete = (newFindings: Finding[], stats: { resources: number; findings: number }, tenant: string, snapshot: string) => {
    setFindings(newFindings)
    setScanStats(stats)
    setTenantId(tenant)
    setSnapshotKey(snapshot)
  }
  
  // Clear filters when tenant changes
  useEffect(() => {
    if (tenantId) {
      setSeverityFilter([])
      setResourceTypeFilter('')
    }
  }, [tenantId])

  // Note: Resources modal functionality was part of old DashboardView
  // This can be re-implemented in a future task if needed
  // const handleOpenResourcesModal = () => {
  //   if (snapshotKey && tenantId) {
  //     setShowResourcesModal(true)
  //   }
  // }

  const handleCloseResourcesModal = () => {
    setShowResourcesModal(false)
  }

  const handleInvalidRoute = useCallback((path: string) => {
    showToast(`The page "${path}" was not found. Redirecting to dashboard.`, 'warning')
  }, [showToast])

  return (
    <BrowserRouter>
      <Sidebar 
        isCollapsed={sidebarCollapsed}
      />
      
      <MainLayout sidebarCollapsed={sidebarCollapsed}>
        <Header />
        
        <main>
          <Routes>
            {/* Root redirect to default dashboard section */}
            <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.DASHBOARD.OVERVIEW_METRICS} replace />} />
            
            {/* Dashboard section routes */}
            <Route 
              path={ROUTES.DASHBOARD.OVERVIEW_METRICS} 
              element={
                <ContentArea
                  tenantId={tenantId}
                  findings={findings}
                  loading={loading}
                  onScanComplete={handleScanComplete}
                  onLoadingChange={setLoading}
                  severityFilter={severityFilter}
                  resourceTypeFilter={resourceTypeFilter}
                  onSeverityFilterChange={setSeverityFilter}
                  onResourceTypeFilterChange={setResourceTypeFilter}
                />
              } 
            />
            <Route 
              path={ROUTES.DASHBOARD.SEVERITY_DISTRIBUTION} 
              element={
                <ContentArea
                  tenantId={tenantId}
                  findings={findings}
                  loading={loading}
                  onScanComplete={handleScanComplete}
                  onLoadingChange={setLoading}
                  severityFilter={severityFilter}
                  resourceTypeFilter={resourceTypeFilter}
                  onSeverityFilterChange={setSeverityFilter}
                  onResourceTypeFilterChange={setResourceTypeFilter}
                />
              } 
            />
            <Route 
              path={ROUTES.DASHBOARD.TOP_FAILING_RULES} 
              element={
                <ContentArea
                  tenantId={tenantId}
                  findings={findings}
                  loading={loading}
                  onScanComplete={handleScanComplete}
                  onLoadingChange={setLoading}
                  severityFilter={severityFilter}
                  resourceTypeFilter={resourceTypeFilter}
                  onSeverityFilterChange={setSeverityFilter}
                  onResourceTypeFilterChange={setResourceTypeFilter}
                />
              } 
            />
            <Route 
              path={ROUTES.DASHBOARD.FINDINGS_TIMELINE} 
              element={
                <ContentArea
                  tenantId={tenantId}
                  findings={findings}
                  loading={loading}
                  onScanComplete={handleScanComplete}
                  onLoadingChange={setLoading}
                  severityFilter={severityFilter}
                  resourceTypeFilter={resourceTypeFilter}
                  onSeverityFilterChange={setSeverityFilter}
                  onResourceTypeFilterChange={setResourceTypeFilter}
                />
              } 
            />
            
            {/* Findings Table route */}
            <Route 
              path={ROUTES.FINDINGS} 
              element={
                <ContentArea
                  tenantId={tenantId}
                  findings={findings}
                  loading={loading}
                  onScanComplete={handleScanComplete}
                  onLoadingChange={setLoading}
                  severityFilter={severityFilter}
                  resourceTypeFilter={resourceTypeFilter}
                  onSeverityFilterChange={setSeverityFilter}
                  onResourceTypeFilterChange={setResourceTypeFilter}
                />
              } 
            />
            
            {/* Catch-all route for invalid paths - redirect to default with toast notification */}
            <Route path="*" element={<InvalidRouteHandler onInvalidRoute={handleInvalidRoute} />} />
          </Routes>
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

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </BrowserRouter>
  )
}

export default App
