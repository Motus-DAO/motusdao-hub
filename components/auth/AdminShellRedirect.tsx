'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { authFetch } from '@/lib/auth/client'
import { useWallet, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import { sessionBelongsToWallet } from '@/lib/auth/hub-session'

/**
 * If a non-admin wallet SIWEs while the browser is still on /admin/*, send them
 * home instead of trapping them behind AdminAuthGate + broken role toggles.
 */
export function AdminShellRedirect() {
  const pathname = usePathname()
  const router = useRouter()
  const { ready, authenticated } = useWallet()
  const { wallets } = useWallets()
  const eoaAddress = getEOAAddress(wallets)
  const { sessionState } = useSiweSession()

  useEffect(() => {
    if (!pathname?.startsWith('/admin')) return
    if (!ready || !authenticated || !eoaAddress) return
    if (sessionState !== 'ready') return

    let cancelled = false

    const verify = async () => {
      const me = await authFetch('/api/auth/me')
      if (!me.ok) {
        router.replace('/')
        return
      }
      const session = (await me.json()) as { eoaAddress?: string | null }
      if (
        session.eoaAddress &&
        !sessionBelongsToWallet(session.eoaAddress, eoaAddress)
      ) {
        router.replace('/')
        return
      }

      const access = await authFetch('/api/admin/check-access')
      if (cancelled) return
      if (access.status === 403 || access.status === 401) {
        router.replace('/')
      }
    }

    void verify()

    return () => {
      cancelled = true
    }
  }, [pathname, ready, authenticated, eoaAddress, sessionState, router])

  return null
}