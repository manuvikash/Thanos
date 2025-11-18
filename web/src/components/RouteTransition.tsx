import { ReactNode, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

interface RouteTransitionProps {
  children: ReactNode
}

export function RouteTransition({ children }: RouteTransitionProps) {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState<'fade-in' | 'fade-out'>('fade-in')

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      // Start fade out
      setTransitionStage('fade-out')
    }
  }, [location, displayLocation])

  const handleAnimationEnd = () => {
    if (transitionStage === 'fade-out') {
      // Update the displayed location and start fade in
      setDisplayLocation(location)
      setTransitionStage('fade-in')
    }
  }

  return (
    <div
      className={`transition-opacity duration-150 ease-in-out ${
        transitionStage === 'fade-out' ? 'opacity-0' : 'opacity-100'
      }`}
      onTransitionEnd={handleAnimationEnd}
    >
      {children}
    </div>
  )
}
