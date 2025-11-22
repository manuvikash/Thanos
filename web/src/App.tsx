import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { Header } from './components/Header'
import ResourcesModal from './components/ResourcesModal'
import { AppLayout } from './components/layout/AppLayout'
import { AppSidebar } from './components/layout/AppSidebar'
import { ContentArea } from './components/ContentArea'
import { Toaster } from './components/ui/sonner'
import { InvalidRouteHandler } from './components/InvalidRouteHandler'
import { ThemeProvider } from './contexts/ThemeContext'
import { BackgroundSphere } from './components/BackgroundSphere'
import { useToast } from './hooks/useToast'
import { Finding } from './api'
import { ROUTES } from './routes'
import { SidebarInset } from './components/ui/sidebar'
import CustomerOnboarding from './pages/CustomerOnboarding'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/Login'
import ConfigManagement from './pages/ConfigManagement'
import { configureAuth } from './utils/auth'
import { RequireAuth } from './components/auth/RequireAuth'

// Initialize Amplify Auth
configureAuth();

function App() {
  const { showToast } = useToast()

  // Existing state management
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
    showToast(`Scan completed successfully! Found ${stats.findings} findings across ${stats.resources} resources.`, 'success')
  }

  const handleScanError = (error: string) => {
    showToast(`Scan failed: ${error}`, 'error')
  }

  const handleReset = () => {
    setFindings([])
    setTenantId('')
    setScanStats(null)
    setSnapshotKey('')
  }

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
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path={ROUTES.ROOT} element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Customer Onboarding Route - Standalone Layout */}
          <Route path={ROUTES.REGISTER} element={<CustomerOnboarding />} />

          {/* Dashboard Routes - App Layout - Protected */}
          <Route
            element={
              <RequireAuth>
                <AppLayout>
                  <AppSidebar />

                  <SidebarInset className="relative overflow-x-hidden">
                    {/* Background decorative sphere - theme-aware */}
                    <BackgroundSphere />

                    <Header />

                    <main className="relative z-10">
                      <Outlet />
                    </main>
                  </SidebarInset>
                </AppLayout>
              </RequireAuth>
            }
          >
            {/* Dashboard section routes */}
            <Route
              path={ROUTES.DASHBOARD.OVERVIEW_METRICS}
              element={
                <ContentArea
                  tenantId={tenantId}
                  findings={findings}
                  loading={loading}
                  snapshotKey={snapshotKey}
                  onScanComplete={handleScanComplete}
                  onScanError={handleScanError}
                  onLoadingChange={setLoading}
                  onReset={handleReset}
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
                  snapshotKey={snapshotKey}
                  onScanComplete={handleScanComplete}
                  onScanError={handleScanError}
                  onLoadingChange={setLoading}
                  onReset={handleReset}
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
                  snapshotKey={snapshotKey}
                  onScanComplete={handleScanComplete}
                  onScanError={handleScanError}
                  onLoadingChange={setLoading}
                  onReset={handleReset}
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
                  snapshotKey={snapshotKey}
                  onScanComplete={handleScanComplete}
                  onScanError={handleScanError}
                  onLoadingChange={setLoading}
                  onReset={handleReset}
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
                  snapshotKey={snapshotKey}
                  onScanComplete={handleScanComplete}
                  onScanError={handleScanError}
                  onLoadingChange={setLoading}
                  onReset={handleReset}
                />
              }
            />

            {/* Configuration Management route */}
            <Route path={ROUTES.CONFIG} element={<ConfigManagement />} />

            {/* Catch-all route for invalid paths - redirect to default with toast notification */}
            <Route path="*" element={<InvalidRouteHandler onInvalidRoute={handleInvalidRoute} />} />
          </Route>
        </Routes>

        {/* Resources Modal */}
        <ResourcesModal
          isOpen={showResourcesModal}
          onClose={handleCloseResourcesModal}
          tenantId={tenantId}
          snapshotKey={snapshotKey}
          totalCount={scanStats?.resources || 0}
        />

        {/* Sonner Toast Notifications */}
        <Toaster position="top-center" richColors closeButton />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
