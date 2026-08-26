'use client'

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useWallet, useWalletProvider, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import {
  bootstrapHubSessionIfNeeded,
  establishSiweSession,
  fetchAppSession,
  isUserRejectedSignError,
  waitForExistingHubBootstrap,
} from '@/lib/auth/client'
import { SIWE_SESSION_LOADING_TIMEOUT_MS } from '@/lib/auth/hub-session'

export type SiweSessionState = 'loading' | 'ready' | 'needs_signature' | 'no_wallet'

export type SiweSessionValue = {
  sessionState: SiweSessionState
  signing: boolean
  signError: string | null
  eoaAddress: string | null
  signIn: () => Promise<boolean>
  refresh: () => Promise<void>
  isSessionReady: boolean
}

const SiweSessionContext = createContext<SiweSessionValue | null>(null)

function useSiweSessionController(): SiweSessionValue {
  const { ready, authenticated, user, providerId } = useWallet()
  const { provider } = useWalletProvider()
  const { wallets } = useWallets()
  const eoaAddress = getEOAAddress(wallets)

  const [sessionState, setSessionState] = useState<SiweSessionState>('loading')
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!ready) return

    if (!authenticated) {
      setSessionState('no_wallet')
      setSignError(null)
      return
    }

    if (!eoaAddress) {
      return
    }

    try {
      const session = await fetchAppSession()
      if (session.authenticated && session.eoaAddress) {
        setSessionState('ready')
        setSignError(null)
        return
      }

      // Surface the sign prompt immediately. Waiting on SIWE here left
      // /perfil stuck on "Cargando perfil..." / "Verificando sesión…".
      setSessionState('needs_signature')

      if (!provider) return

      const authProvider =
        providerId === 'external'
          ? 'external'
          : providerId === 'privy'
            ? 'privy'
            : 'waap'

      const bootstrapped = await bootstrapHubSessionIfNeeded({
        waapProvider: provider,
        authProvider,
        authProviderId: user?.id,
        eoaAddress,
      })

      if (!bootstrapped) return

      const next = await fetchAppSession()
      if (next.authenticated && next.eoaAddress) {
        setSessionState('ready')
        setSignError(null)
      }
    } catch (error) {
      setSessionState('needs_signature')
      setSignError(
        error instanceof Error
          ? error.message
          : 'No se pudo verificar la sesión. Intenta de nuevo.'
      )
    }
  }, [ready, authenticated, eoaAddress, provider, providerId, user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (sessionState !== 'loading') return

    const timeout = window.setTimeout(() => {
      setSessionState(authenticated ? 'needs_signature' : 'no_wallet')
      setSignError('La verificación de sesión tardó demasiado. Intenta de nuevo.')
    }, SIWE_SESSION_LOADING_TIMEOUT_MS)

    return () => window.clearTimeout(timeout)
  }, [sessionState, authenticated])

  const signIn = useCallback(async () => {
    if (!provider) {
      setSignError('Wallet no disponible. Recarga la página e intenta de nuevo.')
      return false
    }

    setSigning(true)
    setSignError(null)

    try {
      const inFlight = waitForExistingHubBootstrap()
      if (inFlight) {
        const ok = await inFlight
        await refresh()
        return ok
      }

      const authProvider =
        providerId === 'external'
          ? 'external'
          : providerId === 'privy'
            ? 'privy'
            : 'waap'

      await establishSiweSession({
        waapProvider: provider,
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
  }, [provider, user?.id, eoaAddress, refresh, providerId])

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

export function SiweSessionProvider({ children }: { children: ReactNode }) {
  const value = useSiweSessionController()
  return createElement(SiweSessionContext.Provider, { value }, children)
}

export function useSiweSession(): SiweSessionValue {
  const ctx = useContext(SiweSessionContext)
  if (!ctx) {
    throw new Error('useSiweSession must be used within SiweSessionProvider')
  }
  return ctx
}
