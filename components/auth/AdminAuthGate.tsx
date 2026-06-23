'use client'

import { useCallback, useEffect, useState } from 'react'
import { useWaaP, useWaaPWallets } from '@/lib/contexts/WaaPProvider'
import { getEOAAddress } from '@/lib/wallet-utils'
import {
  authFetch,
  establishSiweSession,
  fetchAppSession,
  isUserRejectedSignError,
} from '@/lib/auth/client'
import { CTAButton } from '@/components/ui/CTAButton'
import { GlassCard } from '@/components/ui/GlassCard'

type AdminAccessState =
  | 'loading'
  | 'unauthenticated'
  | 'needs_signature'
  | 'forbidden'
  | 'authorized'

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, user, waapProvider } = useWaaP()
  const { wallets } = useWaaPWallets()
  const eoaAddress = getEOAAddress(wallets)

  const [access, setAccess] = useState<AdminAccessState>('loading')
  const [sessionEoa, setSessionEoa] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)

  const checkAccess = useCallback(async () => {
    if (!ready) return

    if (!authenticated) {
      setAccess('unauthenticated')
      setSessionEoa(null)
      return
    }

    setSignError(null)

    const session = await fetchAppSession()
    if (!session.authenticated) {
      setSessionEoa(eoaAddress)
      setAccess('needs_signature')
      return
    }

    setSessionEoa(session.eoaAddress)

    const response = await authFetch('/api/admin/check-access')
    if (response.status === 401) {
      setAccess('needs_signature')
      return
    }

    if (!response.ok) {
      setAccess('forbidden')
      return
    }

    const data = await response.json()
    setAccess(data.isAdmin ? 'authorized' : 'forbidden')
  }, [ready, authenticated, eoaAddress])

  useEffect(() => {
    void checkAccess()
  }, [checkAccess])

  const handleSignIn = async () => {
    if (!waapProvider) {
      setSignError('Wallet no disponible. Recarga la página e intenta de nuevo.')
      return
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

      await checkAccess()
    } catch (error) {
      console.error('[AdminAuthGate] SIWE failed:', error)
      if (error instanceof Error && error.name === 'SignMessageError') {
        setSignError(error.message)
      } else if (isUserRejectedSignError(error)) {
        setSignError('Rechazaste la firma en tu wallet. Intenta de nuevo y acepta la solicitud.')
      } else {
        setSignError(
          error instanceof Error
            ? error.message
            : 'No se pudo firmar el mensaje de acceso.'
        )
      }
      setAccess('needs_signature')
    } finally {
      setSigning(false)
    }
  }

  if (!ready || access === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <GlassCard className="p-8">
          <p className="text-muted-foreground">Verificando acceso de administrador…</p>
        </GlassCard>
      </div>
    )
  }

  if (access === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <GlassCard className="p-8 max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold">Inicia sesión</h2>
          <p className="text-muted-foreground text-sm">
            Conecta la wallet de administrador para entrar al panel.
          </p>
          <CTAButton onClick={() => void login()}>Conectar wallet</CTAButton>
        </GlassCard>
      </div>
    )
  }

  if (access === 'needs_signature') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <GlassCard className="p-8 max-w-lg text-center space-y-4">
          <h2 className="text-xl font-semibold">Firma de acceso</h2>
          <p className="text-muted-foreground text-sm">
            Tu wallet está conectada. Firma un mensaje para verificar que eres el
            dueño de la cuenta — esto no cuesta gas.
          </p>
          <p className="text-xs text-muted-foreground">
            Si usas MetaMask: mantén la extensión abierta y acepta la solicitud de firma cuando aparezca.
          </p>
          {sessionEoa && (
            <p className="font-mono text-xs break-all text-muted-foreground">
              {sessionEoa}
            </p>
          )}
          {signError && (
            <p className="text-sm text-red-400">{signError}</p>
          )}
          <CTAButton onClick={() => void handleSignIn()} disabled={signing}>
            {signing ? 'Esperando firma…' : 'Firmar mensaje de acceso'}
          </CTAButton>
        </GlassCard>
      </div>
    )
  }

  if (access === 'forbidden') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <GlassCard className="p-8 max-w-lg text-center space-y-3">
          <h2 className="text-xl font-semibold">Acceso denegado</h2>
          <p className="text-muted-foreground text-sm">
            Esta wallet no tiene permisos de administrador.
          </p>
          {sessionEoa && (
            <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-left">
              <p className="text-xs text-muted-foreground mb-1">Wallet conectada (EOA):</p>
              <p className="font-mono text-xs break-all text-foreground">{sessionEoa}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Para otorgar acceso:{' '}
                <code className="text-foreground">npm run grant-admin -- {sessionEoa}</code>
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    )
  }

  return <>{children}</>
}
