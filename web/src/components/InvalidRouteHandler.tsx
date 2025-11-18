import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ROUTES } from '../routes'

interface InvalidRouteHandlerProps {
  onInvalidRoute: (path: string) => void
}

export function InvalidRouteHandler({ onInvalidRoute }: InvalidRouteHandlerProps) {
  const location = useLocation()

  useEffect(() => {
    // Notify parent component about invalid route
    onInvalidRoute(location.pathname)
  }, [location.pathname, onInvalidRoute])

  return <Navigate to={ROUTES.DASHBOARD.OVERVIEW_METRICS} replace />
}
