'use client'

import { useEffect } from 'react'
import { useWaaP } from '@/lib/contexts/WaaPProvider'
import { logoutAppSession } from '@/lib/auth/client'

/**
 * Clears server session when wallet disconnects.
 * SIWE signing is user-initiated (see AdminAuthGate / signIn buttons) because
 * WaaP and MetaMask require a click for personal_sign UI.
 */
export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = useWaaP()

  useEffect(() => {
    if (ready && !authenticated) {
      void logoutAppSession()
    }
  }, [ready, authenticated])

  return <>{children}</>
}
