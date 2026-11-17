'use client'

import { useMemo, type ReactNode } from 'react'
import { useWaaP, useWaaPProvider, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { WalletContextProvider } from '@/lib/wallet/WalletContext'
import { useThirdwebFallback } from '@/lib/wallet/thirdweb-fallback-context'
import type { WalletInfo, WalletUser } from '@/lib/wallet/types'
import type { Address } from 'viem'

interface WaaPWalletContextBridgeWithFallbackProps {
  children: ReactNode
}

export function WaaPWalletContextBridgeWithFallback({
  children,
}: WaaPWalletContextBridgeWithFallbackProps) {
  const auth = useWaaP()
  const { wallets: waapWallets } = useWaaPWallets()
  const { provider: waapProvider, isReady: waapProviderReady } = useWaaPProvider()
  const fallback = useThirdwebFallback()

  const merged = useMemo(() => {
    if (fallback.isActive && fallback.address) {
      const addr = fallback.address as Address
      const user: WalletUser = {
        id: addr,
        wallet: { address: addr },
      }
      const wallets: WalletInfo[] = [
        {
          address: addr,
          walletClientType: 'thirdweb',
          chainId: '42220',
          connected: true,
        },
      ]
      return {
        configuredProvider: 'waap' as const,
        ready: true,
        authenticated: true,
        user,
        login: fallback.connectWithThirdweb,
        logout: async () => {
          await fallback.clearThirdwebFallback()
          await auth.logout()
        },
        requestSharedEmail: async () => null,
        wallets,
        provider: fallback.eip1193Provider ?? waapProvider,
        isProviderReady: Boolean(fallback.eip1193Provider || fallback.address),
        emailLogin: {
          sendCode: auth.sendCode,
          loginWithCode: auth.loginWithCode,
        },
        setupError: null as string | null | undefined,
      }
    }

    return {
      configuredProvider: 'waap' as const,
      ready: auth.ready,
      authenticated: auth.authenticated,
      user: auth.user,
      login: auth.login,
      logout: async () => {
        await fallback.clearThirdwebFallback()
        await auth.logout()
      },
      requestSharedEmail: auth.requestSharedEmail,
      wallets: waapWallets as WalletInfo[],
      provider: waapProvider,
      isProviderReady: waapProviderReady,
      emailLogin: {
        sendCode: auth.sendCode,
        loginWithCode: auth.loginWithCode,
      },
      setupError: null as string | null | undefined,
    }
  }, [auth, fallback, waapProvider, waapProviderReady, waapWallets])

  return (
    <WalletContextProvider value={merged}>{children}</WalletContextProvider>
  )
}