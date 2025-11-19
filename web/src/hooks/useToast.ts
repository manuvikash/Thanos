import { toast } from 'sonner'

export interface ToastMessage {
  id: string
  message: string
  type: 'info' | 'error' | 'success' | 'warning'
}

export function useToast() {
  const showToast = (message: string, type: ToastMessage['type'] = 'info') => {
    // Map existing toast types to Sonner variants
    switch (type) {
      case 'success':
        toast.success(message, { duration: 5000 })
        break
      case 'error':
        toast.error(message, { duration: 5000 })
        break
      case 'warning':
        toast.warning(message, { duration: 5000 })
        break
      case 'info':
      default:
        toast.info(message, { duration: 5000 })
        break
    }
  }

  // Maintain backward compatibility - these are no longer needed but kept for API compatibility
  const removeToast = (_id: string) => {
    // Sonner handles dismissal automatically
  }

  return {
    toasts: [], // Empty array for backward compatibility
    showToast,
    removeToast,
  }
}
