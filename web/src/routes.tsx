/**
 * Route path definitions for the application
 */
export const ROUTES = {
  ROOT: '/',
  DASHBOARD: '/dashboard',
  FINDINGS: '/findings',
  ONBOARD: '/onboard',
  MCP: '/mcp',
  CONFIG: '/config',
  REGISTER: '/register',
  ALERTS: '/alerts',
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
  return ROUTES.DASHBOARD
}
