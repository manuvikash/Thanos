// This component is deprecated and replaced by Sonner
// Kept for backward compatibility but no longer renders anything
// All toast notifications are now handled by Sonner's Toaster component

interface ToastProps {
  message: string
  type?: 'info' | 'error' | 'success' | 'warning'
  duration?: number
  onClose: () => void
}

export function Toast(_props: ToastProps) {
  // Component no longer renders - Sonner handles all toast notifications
  return null
}
