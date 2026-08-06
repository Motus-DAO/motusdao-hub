'use client'

import { useEffect, useRef } from 'react'
import { useWallet } from '@/lib/wallet'
import { logoutAppSession } from '@/lib/auth/client'

/**
 * Clears server SIWE session only after a real wallet disconnect.
 * Do not logout on the initial ready && !authenticated window — that races
 * WaaP auto-connect and wiped valid motus_session cookies on every reload.
 */
export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = useWallet()
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

  return <>{children}</>
}
