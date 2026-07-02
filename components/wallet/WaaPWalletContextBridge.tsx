'use client'

import type { ReactNode } from 'react'
import { useWaaP, useWaaPProvider, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { WalletContextProvider } from '@/lib/wallet/WalletContext'
import type { WalletInfo } from '@/lib/wallet/types'

interface WaaPWalletContextBridgeProps {
  children: ReactNode
}

export function WaaPWalletContextBridge({ children }: WaaPWalletContextBridgeProps) {
  const auth = useWaaP()
  const { wallets } = useWaaPWallets()
  const { provider, isReady } = useWaaPProvider()

  return (
    <WalletContextProvider
      value={{
        configuredProvider: 'waap',
        ready: auth.ready,
        authenticated: auth.authenticated,
        user: auth.user,
        login: auth.login,
        logout: auth.logout,
        wallets: wallets as WalletInfo[],
        provider,
        isProviderReady: isReady,
        emailLogin: {
          sendCode: auth.sendCode,
          loginWithCode: auth.loginWithCode,
        },
      }}
    >
      {children}
    </WalletContextProvider>
  )
}
