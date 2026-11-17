'use client'

import type { ReactNode } from 'react'
import { WalletAuthShell } from '@/components/wallet/WalletAuthShell'
import { ThirdwebWalletContextBridge } from '@/components/wallet/ThirdwebWalletContextBridge'
import { getThirdwebClientId } from '@/lib/wallet/config'
import { THIRDWEB_SETUP_MESSAGE } from '@/lib/wallet/providers/thirdweb'
import { WalletContextProvider } from '@/lib/wallet/WalletContext'

interface ThirdwebWalletProviderWrapperProps {
  children: ReactNode
}

function ThirdwebSetupRequired({ children }: { children: ReactNode }) {
  const message = THIRDWEB_SETUP_MESSAGE

  return (
    <WalletContextProvider
      value={{
        configuredProvider: 'thirdweb',
        ready: true,
        authenticated: false,
        user: null,
        login: async () => {
          throw new Error(message)
        },
        logout: async () => {},
        requestSharedEmail: async () => null,
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
 * Thirdweb-backed wallet tree. Enable via NEXT_PUBLIC_WALLET_PROVIDER=thirdweb.
 */
export function ThirdwebWalletProviderWrapper({ children }: ThirdwebWalletProviderWrapperProps) {
  const clientId = getThirdwebClientId()

  if (!clientId) {
    return <ThirdwebSetupRequired>{children}</ThirdwebSetupRequired>
  }

  return (
    <div suppressHydrationWarning>
      <ThirdwebWalletContextBridge>
        <WalletAuthShell>{children}</WalletAuthShell>
      </ThirdwebWalletContextBridge>
    </div>
  )
}