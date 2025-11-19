/**
 * Route path definitions for the application
 */
export const ROUTES = {
  ROOT: '/',
  DASHBOARD: {
    OVERVIEW_METRICS: '/dashboard/overview-metrics',
    SEVERITY_DISTRIBUTION: '/dashboard/severity-distribution',
    TOP_FAILING_RULES: '/dashboard/top-failing-rules',
    FINDINGS_TIMELINE: '/dashboard/findings-timeline',
  },
  FINDINGS: '/findings',
  REGISTER: '/register',
} as const

/**
 * Helper to check if a path is a dashboard child route
 */
export const isDashboardRoute = (path: string): boolean => {
  return path.startsWith('/dashboard/')
}

/**
 * Get the default dashboard route
 */
export const getDefaultDashboardRoute = (): string => {
  return ROUTES.DASHBOARD.OVERVIEW_METRICS
}
