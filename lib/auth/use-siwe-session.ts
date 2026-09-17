'use client'

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useWallet, useWalletProvider, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import {
  establishSiweSession,
  fetchAppSession,
  isUserRejectedSignError,
  waitForExistingHubBootstrap,
} from '@/lib/auth/client'
import { SIWE_SESSION_LOADING_TIMEOUT_MS, SIWE_SIGN_TIMEOUT_MS } from '@/lib/auth/hub-session'
import { withSignTimeout } from '@/lib/auth/signing'
import { dismissWaapWalletOverlay } from '@/lib/wallet/waap-modal-recovery'

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
  const signingLockRef = useRef(false)

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

      // Surface the sign CTA immediately. Do NOT auto-call personal_sign here:
      // background WaaP signing often hangs with no modal, and then "Firmar"
      // waits forever on the shared in-flight bootstrap.
      setSessionState('needs_signature')
    } catch (error) {
      setSessionState('needs_signature')
      setSignError(
        error instanceof Error
          ? error.message
          : 'No se pudo verificar la sesión. Intenta de nuevo.'
      )
    }
  }, [ready, authenticated, eoaAddress])

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

    if (signingLockRef.current) {
      return false
    }
    signingLockRef.current = true

    setSigning(true)
    setSignError(null)

    try {
      const inFlight = waitForExistingHubBootstrap()
      if (inFlight) {
        try {
          const ok = await withSignTimeout(
            inFlight,
            SIWE_SIGN_TIMEOUT_MS,
            'La firma en curso no respondió. Intenta de nuevo.'
          )
          if (ok) {
            await refresh()
            return true
          }
        } catch {
          // Stale/hung bootstrap — fall through to a fresh explicit SIWE.
        }
      }

      const authProvider =
        providerId === 'external'
          ? 'external'
          : providerId === 'privy'
            ? 'privy'
            : 'waap'

      await withSignTimeout(
        establishSiweSession({
          waapProvider: provider,
          authProvider,
          authProviderId: user?.id,
          eoaAddress: eoaAddress ?? undefined,
        }),
        SIWE_SIGN_TIMEOUT_MS,
        'La firma tardó demasiado. Revisa si hay un popup de wallet bloqueado e intenta de nuevo.'
      )

      await refresh()
      return true
    } catch (error) {
      // Unblock the UI if Human Tech left the signing shell open.
      dismissWaapWalletOverlay()

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
      signingLockRef.current = false
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
