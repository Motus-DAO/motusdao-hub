'use client'

import { useEffect } from 'react'
import { useWallet } from '@/lib/wallet'
import { logoutAppSession } from '@/lib/auth/client'

/**
 * Clears server session when wallet disconnects.
 * SIWE signing is user-initiated (see AdminAuthGate / signIn buttons) because
 * WaaP and MetaMask require a click for personal_sign UI.
 */
export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = useWallet()

  useEffect(() => {
    if (ready && !authenticated) {
      void logoutAppSession()
    }
  }, [ready, authenticated])

  return <>{children}</>
}
