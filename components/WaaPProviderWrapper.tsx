'use client'

import { ReactNode, Component, ErrorInfo } from 'react'
import { WaaPProvider } from '@/lib/contexts/WaaPProvider'
import { WalletAuthShell } from '@/components/wallet/WalletAuthShell'
import { WaaPWalletContextBridge } from '@/components/wallet/WaaPWalletContextBridge'
import { isRecoverableWaapSdkError } from '@/lib/wallet/waap-errors'

interface WaaPProviderWrapperProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
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
    if (isRecoverableWaapSdkError(error)) {
      return { hasError: false, error: null }
    }
    
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isRecoverableWaapSdkError(error)) {
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
 * WaaP Provider Wrapper
 * 
 * Replaces PrivyProviderWrapper to use WaaP (Human.tech Wallet as Protocol)
 * as the EOA creation provider.
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
 *   └── App Components
 * 
 * @see https://docs.wallet.human.tech/quick-start
 */
export function WaaPProviderWrapper({ children }: WaaPProviderWrapperProps) {
  return (
    <WaaPErrorBoundary>
      <div suppressHydrationWarning>
        <WaaPProvider>
          <WaaPWalletContextBridge>
            <WalletAuthShell>{children}</WalletAuthShell>
          </WaaPWalletContextBridge>
        </WaaPProvider>
      </div>
    </WaaPErrorBoundary>
  )
}

export { isWaaPEncodingError } from '@/lib/wallet/waap-errors'
