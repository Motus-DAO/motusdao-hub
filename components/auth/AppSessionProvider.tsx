'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useWallet } from '@/lib/wallet'
import { logoutAppSession } from '@/lib/auth/client'
import { SiweSessionProvider } from '@/lib/auth/use-siwe-session'

/**
 * Hub session lifecycle:
 * - SIWE session state is shared via SiweSessionProvider (one instance app-wide).
 * - Clear server SIWE session only after a confirmed wallet disconnect.
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
  const authenticatedRef = useRef(authenticated)
  authenticatedRef.current = authenticated

  useEffect(() => {
    if (!ready) return

    if (authenticated) {
      hadAuthenticated.current = true
      return
    }

    if (!hadAuthenticated.current) return

    // WaaP emits brief unauthenticated gaps during personal_sign — wait before
    // wiping the Hub cookie or Motus Names / enrollment lose SIWE mid-flow.
    const timer = window.setTimeout(() => {
      if (!authenticatedRef.current && hadAuthenticated.current) {
        hadAuthenticated.current = false
        void logoutAppSession()
      }
    }, 2_000)

    return () => window.clearTimeout(timer)
  }, [ready, authenticated])

  return null
}
