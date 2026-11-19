'use client'

import { useCallback, useState } from 'react'
import { Loader2, Shield } from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import {
  DATA_KEY_MODE_COPY,
  type DataKeyMode,
} from '@/lib/account-data-key/constants'
import { migrateDataKeyMode } from '@/lib/account-data-key/migrate-client'
import type { DataKeyPrefsResponse } from '@/lib/account-data-key/profile-client'
import { patchDataKeyMode } from '@/lib/account-data-key/profile-client'

type Props = {
  userId: string
  eoaAddress: string | null
  prefs: DataKeyPrefsResponse | null
  prefsLoading: boolean
  effectiveMode: DataKeyMode
  getKey: () => CryptoKey | null
  isUnlocked: boolean
  unlock: () => Promise<boolean>
  getWalletSignatureKey: () => Promise<CryptoKey | null>
  onPrefsChange: () => Promise<unknown>
}

export function DataKeyPrivacyPanel({
  userId,
  eoaAddress,
  prefs,
  prefsLoading,
  effectiveMode,
  getKey,
  isUnlocked,
  unlock,
  getWalletSignatureKey,
  onPrefsChange,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [targetMode, setTargetMode] = useState<DataKeyMode | null>(null)

  const hasEncryptedData = Boolean(prefs?.hasEncryptedData)

  const applyMode = useCallback(
    async (mode: DataKeyMode) => {
      setError(null)
      setBusy(true)
      try {
        if (hasEncryptedData) {
          if (!eoaAddress || !prefs) {
            setError('Wallet o sesión incompleta.')
            return
          }
          const walletSignatureKey = await getWalletSignatureKey()
          if (!walletSignatureKey) {
            setError('Necesitas firmar con tu wallet para descifrar y volver a cifrar.')
            return
          }
          await migrateDataKeyMode({
            userId,
            eoaAddress,
            walletSignatureKey,
            fromPrefs: prefs,
            targetMode: mode,
          })
        } else {
          const res = await patchDataKeyMode({ mode })
          if (!res.ok) {
            setError('No se pudo guardar la preferencia.')
            return
          }
        }
        await onPrefsChange()
        setTargetMode(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cambiar el modo')
      } finally {
        setBusy(false)
      }
    },
    [hasEncryptedData, eoaAddress, prefs, userId, getWalletSignatureKey, onPrefsChange]
  )

  if (prefsLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Cargando preferencias de cifrado…
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30">
          <Shield className="h-5 w-5 text-mauve-400" aria-hidden />
        </div>
        <div>
          <h3 className="font-medium text-foreground">Privacidad de datos (bitácora + Psychat)</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Modo actual:{' '}
            <strong className="text-foreground">
              {effectiveMode === 'account' ? 'Por cuenta Motus' : 'Solo esta wallet'}
            </strong>
            {prefs?.isLegacy ? ' (heredado v1)' : ''}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {DATA_KEY_MODE_COPY[effectiveMode].body}
      </p>

      {hasEncryptedData ? (
        <p className="text-xs text-amber-400/90">
          Tienes datos cifrados. Cambiar de modo descifra en tu navegador y vuelve a cifrar antes de
          guardar.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <CTAButton
          type="button"
          size="sm"
          variant={effectiveMode === 'account' ? 'secondary' : 'primary'}
          disabled={busy || effectiveMode === 'account'}
          onClick={() => setTargetMode('account')}
        >
          Usar modo cuenta
        </CTAButton>
        <CTAButton
          type="button"
          size="sm"
          variant={effectiveMode === 'wallet' ? 'secondary' : 'primary'}
          disabled={busy || effectiveMode === 'wallet'}
          onClick={() => setTargetMode('wallet')}
        >
          Usar solo esta wallet
        </CTAButton>
      </div>

      {targetMode && targetMode !== effectiveMode ? (
        <MotionConfirmBar
          busy={busy}
          targetMode={targetMode}
          onCancel={() => setTargetMode(null)}
          onConfirm={() => void applyMode(targetMode)}
        />
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </section>
  )
}

function MotionConfirmBar({
  busy,
  targetMode,
  onCancel,
  onConfirm,
}: {
  busy: boolean
  targetMode: DataKeyMode
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <p className="text-sm text-foreground">
            Confirmar cambio a: <strong>{DATA_KEY_MODE_COPY[targetMode].title}</strong>
      </p>
      <p className="text-xs text-muted-foreground">{DATA_KEY_MODE_COPY[targetMode].body}</p>
      <div className="flex gap-2">
        <CTAButton type="button" size="sm" disabled={busy} onClick={onConfirm}>
          {busy ? 'Procesando…' : 'Confirmar'}
        </CTAButton>
        <CTAButton type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancelar
        </CTAButton>
      </div>
    </div>
  )
}