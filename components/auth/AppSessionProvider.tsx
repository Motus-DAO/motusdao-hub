'use client'

import { useEffect, useRef } from 'react'
import { useWallet, useWalletProvider, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import { bootstrapHubSessionIfNeeded, logoutAppSession } from '@/lib/auth/client'

/**
 * Hub session lifecycle:
 * - After WaaP login, bootstrap/recreate motus_session (SIWE).
 * - Clear server SIWE session only after a real wallet disconnect.
 * Do not logout on the initial ready && !authenticated window — that races
 * WaaP auto-connect and wiped valid motus_session cookies on every reload.
 */
export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, providerId } = useWallet()
  const { provider } = useWalletProvider()
  const { wallets } = useWallets()
  const eoaAddress = getEOAAddress(wallets)
  const hadAuthenticated = useRef(false)

  useEffect(() => {
    if (!ready) return

    if (authenticated) {
      hadAuthenticated.current = true
      return
    }

    if (hadAuthenticated.current) {
      hadAuthenticated.current = false
      void logoutAppSession()
    }
  }, [ready, authenticated])

  useEffect(() => {
    if (!ready || !authenticated || !provider || !eoaAddress) return

    const authProvider =
      providerId === 'external'
        ? 'external'
        : providerId === 'privy'
          ? 'privy'
          : 'waap'

    void bootstrapHubSessionIfNeeded({
      waapProvider: provider,
      authProvider,
      authProviderId: user?.id,
      eoaAddress,
    })
  }, [ready, authenticated, provider, eoaAddress, providerId, user?.id])

  return <>{children}</>
}
