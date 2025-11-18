import { Component, ReactNode } from 'react'

interface DashboardErrorBoundaryProps {
  children: ReactNode
}

interface DashboardErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
}

export class DashboardErrorBoundary extends Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  constructor(props: DashboardErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<DashboardErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console for debugging
    console.error('Dashboard Error Boundary caught an error:', error)
    console.error('Error Info:', errorInfo)
    console.error('Component Stack:', errorInfo.componentStack)

    // Update state with error details
    this.setState({
      errorInfo: errorInfo.componentStack || null,
    })
  }

  handleReload = (): void => {
    // Reset error state to attempt recovery
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Fallback UI when error occurs
      return (
        <div className="bg-[#102020]/50 border border-red-900/50 rounded-lg p-12 backdrop-blur-sm text-center">
          <div className="text-red-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-lg font-medium mb-2">Dashboard Error</p>
            <p className="text-sm text-neutral-400 mb-2">
              {this.state.error?.message || 'An unexpected error occurred while rendering the dashboard'}
            </p>
            
            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-neutral-500 hover:text-neutral-400 mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="bg-neutral-900/50 border border-neutral-800 rounded p-4 text-xs font-mono text-neutral-300 overflow-auto max-h-48">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.error.stack && (
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{this.state.error.stack}</pre>
                    </div>
                  )}
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{this.state.errorInfo}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <button
              onClick={this.handleReload}
              className="mt-6 px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-neutral-900 font-semibold rounded-lg transition-colors"
              aria-label="Reload dashboard"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      )
    }

    // When there's no error, render children normally
    return this.props.children
  }
}
