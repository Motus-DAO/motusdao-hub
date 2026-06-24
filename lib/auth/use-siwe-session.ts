'use client'

import { useCallback, useEffect, useState } from 'react'
import { useWaaP, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { getEOAAddress } from '@/lib/wallet-utils'
import {
  establishSiweSession,
  fetchAppSession,
  isUserRejectedSignError,
} from '@/lib/auth/client'

export type SiweSessionState = 'loading' | 'ready' | 'needs_signature' | 'no_wallet'

export function useSiweSession() {
  const { ready, authenticated, user, waapProvider } = useWaaP()
  const { wallets } = useWaaPWallets()
  const eoaAddress = getEOAAddress(wallets)

  const [sessionState, setSessionState] = useState<SiweSessionState>('loading')
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!ready) return

    if (!authenticated || !eoaAddress) {
      setSessionState('no_wallet')
      setSignError(null)
      return
    }

    const session = await fetchAppSession()
    if (session.authenticated && session.eoaAddress) {
      setSessionState('ready')
      setSignError(null)
      return
    }

    setSessionState('needs_signature')
  }, [ready, authenticated, eoaAddress])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const signIn = useCallback(async () => {
    if (!waapProvider) {
      setSignError('Wallet no disponible. Recarga la página e intenta de nuevo.')
      return false
    }

    setSigning(true)
    setSignError(null)

    try {
      const externalWallet = wallets.find((w) => w.walletClientType === 'external')
      const authProvider = externalWallet ? 'external' : 'waap'

      await establishSiweSession({
        waapProvider,
        authProvider,
        authProviderId: user?.id,
        eoaAddress: eoaAddress ?? undefined,
      })

      await refresh()
      return true
    } catch (error) {
      if (error instanceof Error && error.name === 'SignMessageError') {
        setSignError(error.message)
      } else if (isUserRejectedSignError(error)) {
        setSignError('Rechazaste la firma. Intenta de nuevo y acepta la solicitud en tu wallet.')
      } else {
        setSignError(
          error instanceof Error
            ? error.message
            : 'No se pudo firmar el mensaje de verificación.'
        )
      }
      setSessionState('needs_signature')
      return false
    } finally {
      setSigning(false)
    }
  }, [waapProvider, wallets, user?.id, eoaAddress, refresh])

  return {
    sessionState,
    signing,
    signError,
    eoaAddress,
    signIn,
    refresh,
    isSessionReady: sessionState === 'ready',
  }
}
