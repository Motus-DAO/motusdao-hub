'use client'

import { AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { useEffect } from 'react'
import { CTAButton } from '@/components/ui/CTAButton'
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
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-muted-foreground">
        <Loader className="h-4 w-4 animate-spin" />
        Verificando sesión…
      </div>
    )
  }

  if (sessionState === 'ready') {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <div>
          <p className="font-medium text-emerald-200">Sesión verificada</p>
          <p className="text-emerald-300/90 text-xs">
            Ya puedes subir documentos y usar funciones que requieren tu wallet.
          </p>
        </div>
      </div>
    )
  }

  if (sessionState === 'no_wallet') {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p>Conecta tu wallet antes de continuar.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
      <div className="flex items-start gap-2 text-sm text-amber-100">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="space-y-1">
          <p className="font-medium text-amber-200">
            {compact
              ? 'Falta verificar tu wallet'
              : 'Tu wallet está conectada, pero falta un paso más'}
          </p>
          <p className="text-amber-100/90 text-xs leading-relaxed">
            Conectar la wallet no basta para subir archivos: debes firmar un mensaje de
            verificación (Sign-In with Ethereum). No cuesta gas ni mueve fondos.
          </p>
          {eoaAddress && (
            <p className="font-mono text-xs text-amber-200/80 break-all">{eoaAddress}</p>
          )}
        </div>
      </div>

      {signError && (
        <p className="text-sm text-red-300 flex items-start gap-1.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {signError}
        </p>
      )}

      <CTAButton
        type="button"
        onClick={() => void signIn()}
        disabled={signing}
        className="w-full sm:w-auto"
      >
        {signing ? 'Esperando firma en tu wallet…' : 'Firmar mensaje de verificación'}
      </CTAButton>
    </div>
  )
}
