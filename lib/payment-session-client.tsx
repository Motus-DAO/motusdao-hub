'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchAppSession, type AppSession } from '@/lib/auth/client'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { useWalletProvider, useWallets } from '@/lib/wallet'
import { useThirdwebFallback } from '@/lib/wallet/thirdweb-fallback-context'
import { getEOAAddress } from '@/lib/wallet-utils'
import {
  authProviderPaymentLabel,
  buildSessionPaymentContext,
  type SessionPaymentContext,
} from '@/lib/payment-session'

export { authProviderPaymentLabel, PAYMENT_SESSION_P4_COPY } from '@/lib/payment-session'

export async function getSessionPaymentContext(
  waapBridgeProvider: unknown,
  thirdwebEip1193: unknown | null,
  connectedEoa: string | null
): Promise<SessionPaymentContext> {
  const session = await fetchAppSession()
  if (!session.authenticated || !session.eoaAddress) {
    throw new Error('Sesión requerida para pagar.')
  }
  return buildSessionPaymentContext({
    sessionEoa: session.eoaAddress,
    sessionAuthProvider: session.authProvider,
    connectedEoa,
    waapBridgeProvider,
    thirdwebEip1193,
  })
}

export function useHubPaymentSession() {
  const { provider } = useWalletProvider()
  const { wallets } = useWallets()
  const connectedEoa = getEOAAddress(wallets)
  const thirdweb = useThirdwebFallback()
  const { isSessionReady } = useSiweSession()
  const [session, setSession] = useState<AppSession | null>(null)

  useEffect(() => {
    if (!isSessionReady) {
      setSession(null)
      return
    }
    let cancelled = false
    void fetchAppSession().then((s) => {
      if (!cancelled) setSession(s)
    })
    return () => {
      cancelled = true
    }
  }, [isSessionReady, connectedEoa])

  const thirdwebEip1193 =
    session?.authProvider === 'thirdweb' ? thirdweb.eip1193Provider : null

  const getPaymentContext = useCallback(async () => {
    const live = session ?? (await fetchAppSession())
    if (!live.eoaAddress) {
      throw new Error('Sesión requerida para pagar.')
    }
    return buildSessionPaymentContext({
      sessionEoa: live.eoaAddress,
      sessionAuthProvider: live.authProvider,
      connectedEoa,
      waapBridgeProvider: provider,
      thirdwebEip1193,
    })
  }, [session, connectedEoa, provider, thirdwebEip1193])

  return {
    sessionEoa: session?.eoaAddress ?? null,
    sessionAuthProvider: session?.authProvider ?? null,
    sessionProviderLabel: authProviderPaymentLabel(session?.authProvider),
    isSessionReady: isSessionReady && Boolean(session?.eoaAddress),
    connectedEoa,
    getPaymentContext,
  }
}