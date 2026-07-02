'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  useLoginWithEmail as usePrivyLoginWithEmail,
  usePrivy,
  useWallets as usePrivyWallets,
  type User,
} from '@privy-io/react-auth'
import type { Address } from 'viem'
import { WalletContextProvider } from '@/lib/wallet/WalletContext'
import type { WalletInfo, WalletUser } from '@/lib/wallet/types'

function mapPrivyUser(user: User | null): WalletUser | null {
  if (!user) return null

  return {
    id: user.id,
    email: user.email ? { address: user.email.address } : undefined,
    phone: user.phone ? { number: user.phone.number } : undefined,
    google: user.google ? { email: user.google.email ?? '' } : undefined,
    wallet: user.wallet?.address ? { address: user.wallet.address } : undefined,
  }
}

function mapPrivyWallets(wallets: ReturnType<typeof usePrivyWallets>['wallets']): WalletInfo[] {
  return wallets
    .filter((wallet) => wallet.type === 'ethereum')
    .map((wallet) => ({
      address: wallet.address as Address,
      walletClientType: wallet.walletClientType === 'privy' ? 'privy' : 'external',
      chainId: wallet.chainId,
      connected: true,
    }))
}

interface PrivyWalletContextBridgeProps {
  children: ReactNode
  setupError?: string | null
}

export function PrivyWalletContextBridge({
  children,
  setupError = null,
}: PrivyWalletContextBridgeProps) {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets, ready: walletsReady } = usePrivyWallets()
  const { sendCode, loginWithCode } = usePrivyLoginWithEmail()
  const [provider, setProvider] = useState<unknown | null>(null)
  const [isProviderReady, setIsProviderReady] = useState(false)

  const mappedWallets = useMemo(() => mapPrivyWallets(wallets), [wallets])

  useEffect(() => {
    let cancelled = false

    async function loadProvider() {
      if (!walletsReady || !authenticated || mappedWallets.length === 0) {
        if (!cancelled) {
          setProvider(null)
          setIsProviderReady(false)
        }
        return
      }

      const target =
        wallets.find((wallet) => wallet.walletClientType === 'privy') ?? wallets[0]

      try {
        const ethProvider = await target.getEthereumProvider()
        if (!cancelled) {
          setProvider(ethProvider)
          setIsProviderReady(true)
        }
      } catch {
        if (!cancelled) {
          setProvider(null)
          setIsProviderReady(false)
        }
      }
    }

    void loadProvider()

    return () => {
      cancelled = true
    }
  }, [authenticated, mappedWallets.length, wallets, walletsReady])

  return (
    <WalletContextProvider
      value={{
        configuredProvider: 'privy',
        ready: ready && walletsReady,
        authenticated,
        user: mapPrivyUser(user),
        login: async () => {
          login()
        },
        logout,
        wallets: mappedWallets,
        provider,
        isProviderReady,
        emailLogin: {
          sendCode: async ({ email }) => sendCode({ email }),
          loginWithCode: async ({ code }) => loginWithCode({ code }),
        },
        setupError,
      }}
    >
      {children}
    </WalletContextProvider>
  )
}
