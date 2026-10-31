'use client'

import Link from 'next/link'
import { Loader2, Lock } from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { psychatArchiveOptInCopy } from '@/lib/psychat-archive/constants'
import { usePsychatArchiveKeyContext } from '@/components/psychat/PsychatArchiveKeyContext'

/** Modal sobre el chat cuando la copia cifrada está activada pero falta firma de archivo. */
export function PsychatArchiveUnlockGate() {
  const { unlock, state, unlockError, optIn, loadingOptIn, setArchiveOptIn } =
    usePsychatArchiveKeyContext()
  const unlocking = state === 'unlocking'

  return (
    <div className="px-5 py-6 text-sm">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15">
          {unlocking ? (
            <Loader2 className="h-5 w-5 animate-spin text-amber-300" aria-hidden />
          ) : (
            <Lock className="h-5 w-5 text-amber-400" aria-hidden />
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-foreground leading-snug">
            {unlocking ? 'Esperando firma en tu wallet…' : 'Copia activada — falta tu firma'}
          </p>
          <p className="text-xs text-muted-foreground leading-snug">
            Firma con tu wallet para cifrar y guardar (llave distinta a la bitácora). Hasta entonces el chat está
            bloqueado.
          </p>
        </div>
      </div>

      <label className="mt-4 flex items-start gap-3 cursor-pointer border-t border-white/10 pt-4">
        <input
          type="checkbox"
          className="mt-1"
          checked={optIn}
          disabled={loadingOptIn || unlocking}
          onChange={(e) => void setArchiveOptIn(e.target.checked)}
        />
        <span className="text-xs text-muted-foreground">
          {psychatArchiveOptInCopy}{' '}
          <Link href="/psychat/archivo" className="text-mauve-400 underline whitespace-nowrap">
            Cómo funciona
          </Link>
        </span>
      </label>

      {unlockError ? <p className="mt-3 text-xs text-red-400">{unlockError}</p> : null}

      {!unlocking ? (
        <div className="mt-4">
          <CTAButton type="button" size="sm" className="w-full sm:w-auto" onClick={() => void unlock()}>
            Firmar y desbloquear copia
          </CTAButton>
        </div>
      ) : null}
    </div>
  )
}
