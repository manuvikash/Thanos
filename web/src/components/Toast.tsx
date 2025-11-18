import { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'info' | 'error' | 'success' | 'warning'
  duration?: number
  onClose: () => void
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    info: 'bg-blue-600',
    error: 'bg-red-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
  }[type]

  return (
    <div
      className={`fixed top-20 right-4 z-[100] ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg 
        animate-slide-in-right max-w-md`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
          aria-label="Close notification"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
