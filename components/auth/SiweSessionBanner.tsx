'use client'

import { AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { useEffect } from 'react'
import { CTAButton } from '@/components/ui/CTAButton'
import { StatusBanner } from '@/components/ui/StatusBanner'
import { useSiweSession } from '@/lib/auth/use-siwe-session'

type Props = {
  onReadyChange?: (ready: boolean) => void
  /** Shorter copy for inline use inside forms */
  compact?: boolean
}

export function SiweSessionBanner({ onReadyChange, compact }: Props) {
  const { sessionState, signing, signError, eoaAddress, signIn, isSessionReady } =
    useSiweSession()

  useEffect(() => {
    onReadyChange?.(isSessionReady)
  }, [isSessionReady, onReadyChange])

  if (sessionState === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Loader className="h-4 w-4 animate-spin" />
        Verificando sesión…
      </div>
    )
  }

  if (sessionState === 'ready') {
    return (
      <StatusBanner
        variant="success"
        icon={CheckCircle}
        title="Sesión verificada"
        description="Ya puedes subir documentos y usar funciones que requieren tu wallet."
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
    <StatusBanner variant="warning" icon={AlertCircle} className="space-y-3 py-4">
      <div className="space-y-1">
        <div className="font-medium text-amber-950 dark:text-amber-50">
          {compact
            ? 'Falta verificar tu wallet'
            : 'Tu wallet está conectada, pero falta un paso más'}
        </div>
        <div className="text-xs leading-relaxed text-amber-800 dark:text-amber-100/90">
          Conectar la wallet no basta para subir archivos: debes firmar un mensaje de
          verificación (Sign-In with Ethereum). No cuesta gas ni mueve fondos.
        </div>
        {eoaAddress && (
          <div className="break-all font-mono text-xs text-amber-700 dark:text-amber-200/80">
            {eoaAddress}
          </div>
        )}
      </div>

      {signError && (
        <div className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {signError}
        </div>
      )}

      <CTAButton
        type="button"
        onClick={() => void signIn()}
        disabled={signing}
        className="w-full sm:w-auto"
      >
        {signing ? 'Esperando firma en tu wallet…' : 'Firmar mensaje de verificación'}
      </CTAButton>
    </StatusBanner>
  )
}
