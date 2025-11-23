/**
 * Route path definitions for the application
 */
export const ROUTES = {
  ROOT: '/',
  DASHBOARD: '/dashboard',
  FINDINGS: '/findings',
  CONFIG: '/config',
  MCP: '/mcp',
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
  return ROUTES.DASHBOARD
}
