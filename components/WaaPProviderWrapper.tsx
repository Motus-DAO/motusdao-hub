'use client'

import { ReactNode, Component, ErrorInfo, useEffect } from 'react'
import { WaaPProvider } from '@/lib/contexts/WaaPProvider'
import { ZeroDevSmartWalletProvider } from '@/lib/contexts/ZeroDevSmartWalletProvider'

interface WaaPProviderWrapperProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Check if an error is the known WaaP/ethers encoding error
 * This error occurs when ethers v5 tries to decode a hash as UTF-8
 */
function isWaaPEncodingError(error: unknown): boolean {
  if (!error) return false
  
  const errorStr = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
      ? error 
      : String(error)
  
  return errorStr.includes('invalid codepoint') || 
         errorStr.includes('missing continuation byte') ||
         errorStr.includes('unexpected continuation byte') ||
         errorStr.includes('strings/5.7.0') ||
         errorStr.includes('INVALID_ARGUMENT')
}

/**
 * Error Boundary to catch WaaP SDK internal errors
 * The WaaP SDK sometimes throws UTF-8 encoding errors when processing hashes
 * This boundary catches those errors and allows the app to continue functioning
 */
class WaaPErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Check if it's the known UTF-8 encoding error from WaaP SDK
    if (isWaaPEncodingError(error)) {
      // Silently suppress - this is a known non-fatal SDK bug
      return { hasError: false, error: null }
    }
    
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isWaaPEncodingError(error)) {
      // Silently suppress - this is a known non-fatal SDK bug
      // Reset error state to allow recovery
      this.setState({ hasError: false, error: null })
    } else {
      console.error('[WaaP] Unknown error in provider:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Error en el proveedor de wallet</h2>
            <p className="text-gray-600 mb-4">
              Por favor, recarga la página. Si el problema persiste, intenta cerrar sesión y volver a iniciar.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Component that sets up global error handlers for WaaP SDK errors
 * This runs inside the React tree to properly handle errors that escape the boundary
 */
function WaaPGlobalErrorHandler({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Handle errors that escape React's error boundary
    const handleError = (event: ErrorEvent) => {
      if (isWaaPEncodingError(event.error) || isWaaPEncodingError(event.message)) {
        // Completely suppress - don't even log
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isWaaPEncodingError(event.reason)) {
        // Completely suppress - don't even log
        event.preventDefault()
        return false
      }
    }

    // Also override window.onerror for extra protection
    const originalOnError = window.onerror
    window.onerror = function(message, source, lineno, colno, error) {
      if (isWaaPEncodingError(error) || isWaaPEncodingError(message)) {
        return true // Suppress the error
      }
      if (originalOnError) {
        return originalOnError.call(window, message, source, lineno, colno, error)
      }
      return false
    }

    window.addEventListener('error', handleError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true)

    return () => {
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
      window.onerror = originalOnError
    }
  }, [])

  return <>{children}</>
}

/**
 * WaaP Provider Wrapper
 * 
 * Replaces PrivyProviderWrapper to use WaaP (Human.tech Wallet as Protocol)
 * as the EOA creation provider while keeping:
 * - ZeroDev for smart wallet creation (Kernel v3.1)
 * - Pimlico for paymaster (gasless transactions)
 * 
 * WaaP provides:
 * - Two-Party Computation (2PC) security
 * - Human Keys technology
 * - Email/Phone/Social authentication
 * - EIP-1193 compatible provider (works with viem)
 * - NO APP ID REQUIRED - just install @human.tech/waap-sdk
 * 
 * Architecture:
 * WaaPProvider (EOA creation & auth)
 *   └── ZeroDevSmartWalletProvider (smart wallet via Kernel)
 *       └── App Components
 * 
 * Important: The ZeroDev smart wallet generates the transactions and gets gas sponsored
 * by Pimlico. The WaaP EOA is only used as the signer/owner of the smart wallet.
 * 
 * @see https://docs.wallet.human.tech/quick-start
 */
export function WaaPProviderWrapper({ children }: WaaPProviderWrapperProps) {
  // ZeroDev Project ID - same as before, works with Celo Mainnet
  const zeroDevProjectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || 'e46f4ac3-404e-42fc-a3d3-1c75846538a8'

  return (
    <WaaPErrorBoundary>
      <WaaPGlobalErrorHandler>
        <div suppressHydrationWarning>
          <WaaPProvider>
            <ZeroDevSmartWalletProvider zeroDevProjectId={zeroDevProjectId}>
              {children}
            </ZeroDevSmartWalletProvider>
          </WaaPProvider>
        </div>
      </WaaPGlobalErrorHandler>
    </WaaPErrorBoundary>
  )
}

// Export the error check utility for use elsewhere
export { isWaaPEncodingError }
