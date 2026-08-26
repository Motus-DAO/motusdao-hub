'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useWallet } from '@/lib/wallet'
import { logoutAppSession } from '@/lib/auth/client'
import { SiweSessionProvider } from '@/lib/auth/use-siwe-session'

/**
 * Hub session lifecycle:
 * - SIWE session state is shared via SiweSessionProvider (one instance app-wide).
 * - Clear server SIWE session only after a real wallet disconnect.
 * Do not logout on the initial ready && !authenticated window — that races
 * WaaP auto-connect and wiped valid motus_session cookies on every reload.
 */
export function AppSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SiweSessionProvider>
      <HubSessionDisconnectGuard />
      {children}
    </SiweSessionProvider>
  )
}

function HubSessionDisconnectGuard() {
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

  return null
}
