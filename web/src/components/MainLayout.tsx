import React from 'react'

// Background decorative component - gradient sphere in top-right
const SphereBackground = () => {
  return (
    <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] pointer-events-none z-0 opacity-5" aria-hidden="true">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="sphereGradient" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#0C1A1A" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#sphereGradient)" fillOpacity="0.2" />
        <g stroke="#E5E7EB" strokeWidth="0.15">
          {[...Array(12)].map((_, i) => (
            <ellipse key={`h-${i}`} cx="50" cy="50" rx={50} ry={(i * 50) / 12} fill="none" />
          ))}
          {[...Array(12)].map((_, i) => (
            <ellipse key={`v-${i}`} cx="50" cy="50" rx={(i * 50) / 12} ry={50} fill="none" />
          ))}
        </g>
      </svg>
    </div>
  )
}

// Background decorative component - geometric shapes at bottom
const GeometricFooter = () => {
  return (
    <div className="absolute bottom-0 left-0 w-full h-32 md:h-40 opacity-5 pointer-events-none z-0">
      <svg
        viewBox="0 0 1200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Layered geometric shapes */}
        <path
          d="M0 80 L300 40 L600 100 L900 60 L1200 90 L1200 160 L0 160 Z"
          fill="#8F9779"
          opacity="0.4"
        />
        <path
          d="M0 100 L400 70 L800 110 L1200 80 L1200 160 L0 160 Z"
          fill="#8F9779"
          opacity="0.3"
        />
        <path
          d="M0 120 L500 90 L1000 130 L1200 100 L1200 160 L0 160 Z"
          fill="#8F9779"
          opacity="0.2"
        />
      </svg>
    </div>
  )
}

interface MainLayoutProps {
  children: React.ReactNode
  sidebarCollapsed: boolean
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, sidebarCollapsed }) => {
  return (
    <div className="relative min-h-screen bg-[#0C1A1A] overflow-x-hidden">
      <SphereBackground />
      <GeometricFooter />
      
      <div 
        className={`relative z-10 transition-all duration-200 ${
          sidebarCollapsed ? 'ml-16 md:ml-16' : 'ml-60 md:ml-60'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
