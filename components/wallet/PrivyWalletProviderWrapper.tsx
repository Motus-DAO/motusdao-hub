'use client'

import type { ReactNode } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { WalletAuthShell } from '@/components/wallet/WalletAuthShell'
import { PrivyWalletContextBridge } from '@/components/wallet/PrivyWalletContextBridge'
import { getPrivyAppId } from '@/lib/wallet/config'
import { getPrivyClientConfig } from '@/lib/wallet/providers/privy'
import { WalletContextProvider } from '@/lib/wallet/WalletContext'

interface PrivyWalletProviderWrapperProps {
  children: ReactNode
}

function PrivySetupRequired({ children }: { children: ReactNode }) {
  const message =
    'NEXT_PUBLIC_PRIVY_APP_ID is required when NEXT_PUBLIC_WALLET_PROVIDER=privy'

  return (
    <WalletContextProvider
      value={{
        configuredProvider: 'privy',
        ready: true,
        authenticated: false,
        user: null,
        login: async () => {
          throw new Error(message)
        },
        logout: async () => {},
        wallets: [],
        provider: null,
        isProviderReady: false,
        emailLogin: {
          sendCode: async () => {
            throw new Error(message)
          },
          loginWithCode: async () => {
            throw new Error(message)
          },
        },
        setupError: message,
      }}
    >
      {process.env.NODE_ENV === 'development' ? (
        <div className="bg-amber-500 text-black px-4 py-2 text-sm text-center">{message}</div>
      ) : null}
      <WalletAuthShell>{children}</WalletAuthShell>
    </WalletContextProvider>
  )
}

/**
 * Privy-backed wallet tree. Enable via NEXT_PUBLIC_WALLET_PROVIDER=privy.
 */
export function PrivyWalletProviderWrapper({ children }: PrivyWalletProviderWrapperProps) {
  const appId = getPrivyAppId()

  if (!appId) {
    return <PrivySetupRequired>{children}</PrivySetupRequired>
  }

  return (
    <div suppressHydrationWarning>
      <PrivyProvider appId={appId} config={getPrivyClientConfig()}>
        <PrivyWalletContextBridge>
          <WalletAuthShell>{children}</WalletAuthShell>
        </PrivyWalletContextBridge>
      </PrivyProvider>
    </div>
  )
}
