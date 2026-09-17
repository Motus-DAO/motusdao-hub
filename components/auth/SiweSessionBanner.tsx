'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { SIWE_SESSION_LOADING_TIMEOUT_MS } from '@/lib/auth/hub-session'

type Props = {
  onReadyChange?: (ready: boolean) => void
  /** Shorter copy for inline use inside forms */
  compact?: boolean
}

export function SiweSessionBanner({ onReadyChange, compact }: Props) {
  const { sessionState, signing, signError, eoaAddress, signIn, refresh, isSessionReady } =
    useSiweSession()
  const [loadingStalled, setLoadingStalled] = useState(false)

  useEffect(() => {
    onReadyChange?.(isSessionReady)
  }, [isSessionReady, onReadyChange])

  useEffect(() => {
    if (sessionState !== 'loading') {
      setLoadingStalled(false)
      return
    }
    const timeout = window.setTimeout(
      () => setLoadingStalled(true),
      SIWE_SESSION_LOADING_TIMEOUT_MS
    )
    return () => window.clearTimeout(timeout)
  }, [sessionState])

  if (sessionState === 'loading') {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader className="h-4 w-4 animate-spin" />
          Verificando sesión…
        </div>
        {loadingStalled && (
          <div className="space-y-2">
            <p className="text-xs">
              Esto está tardando más de lo normal. Puedes reintentar o recargar la página.
            </p>
            <CTAButton type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
              Reintentar
            </CTAButton>
          </div>
        )}
      </div>
    )
  }

  if (sessionState === 'ready') {
    return (
      <StatusBanner
        variant="success"
        icon={CheckCircle}
        title="Sesión verificada"
        description="Ya puedes usar funciones que requieren tu wallet (Motus Names, pagos y más)."
      />
    )
  }

  if (sessionState === 'no_wallet') {
    return (
      <StatusBanner
        variant="warning"
        icon={AlertCircle}
        title="Conecta tu wallet antes de continuar."
      />
    )
  }

  return (
    <StatusBanner
      variant="warning"
      icon={AlertCircle}
      className="space-y-3 py-4"
      title={
        compact
          ? 'Falta verificar tu wallet'
          : 'Tu wallet está conectada, pero falta un paso más'
      }
      description={
        compact
          ? 'Firma un mensaje de verificación (SIWE). No cuesta gas ni mueve fondos.'
          : 'Conectar la wallet no basta: debes firmar un mensaje de verificación (Sign-In with Ethereum). No cuesta gas ni mueve fondos.'
      }
    >
      {eoaAddress && (
        <p className="break-all font-mono text-xs opacity-90">{eoaAddress}</p>
      )}
      {signError && (
        <div className="status-banner-error flex items-start gap-1.5 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {signError}
        </div>
      )}

      <CTAButton
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void signIn()
        }}
        disabled={signing}
        className="w-full sm:w-auto"
      >
        {signing ? 'Esperando firma en tu wallet…' : 'Firmar mensaje de verificación'}
      </CTAButton>
    </StatusBanner>
  )
}
