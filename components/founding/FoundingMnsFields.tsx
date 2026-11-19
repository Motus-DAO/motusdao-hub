'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { Address } from 'viem'
import { CTAButton } from '@/components/ui/CTAButton'
import { motusNameService } from '@/lib/motus-name-service'
import { useWalletProvider } from '@/lib/wallet'
import {
  prepareWaapOverlayForWalletRequest,
  releaseWaapOverlayInput,
} from '@/lib/wallet/waap-modal-recovery'
import {
  ensureFoundingFaucetCeloForMns,
  registerMotusName,
  resolveWaaPSigningAddress,
} from '@/lib/mns-register'
import { cn } from '@/lib/utils'

const fieldClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-mauve-500/40'

function sanitizeMnsLabel(input: string): string {
  return input
    .toLowerCase()
    .replace(/\.motus$/i, '')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32)
}

type Props = {
  walletAddress: string | null
  onRegistered: (payload: { mnsLabel: string; mnsTxHash: string }) => void
  onProgress?: (state: { active: boolean; message: string | null }) => void
  disabled?: boolean
}

export function FoundingMnsFields({
  walletAddress,
  onRegistered,
  onProgress,
  disabled,
}: Props) {
  const { provider, isReady: providerReady } = useWalletProvider()
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const runMint = async () => {
    const normalized = sanitizeMnsLabel(label)
    if (!normalized || normalized.length < 2) {
      setStatus('Nombre inválido (a-z, 0-9, guiones).')
      return
    }
    if (!walletAddress) {
      setStatus('Conecta tu wallet primero.')
      return
    }

    setBusy(true)
    setStatus(null)
    onProgress?.({ active: true, message: 'Comprobando disponibilidad…' })

    try {
      const available = await motusNameService.isAvailable(normalized)
      if (!available) {
        setStatus('Nombre no disponible — prueba otro.')
        return
      }

      if (!providerReady || !provider) {
        setStatus('Wallet no lista. Espera un momento o vuelve a iniciar sesión.')
        return
      }

      prepareWaapOverlayForWalletRequest()

      const target = walletAddress as Address
      const signing = (await resolveWaaPSigningAddress(provider)) ?? target

      onProgress?.({ active: true, message: 'Solicitando CELO para gas (firma sin costo)…' })
      const faucet = await ensureFoundingFaucetCeloForMns(signing, provider)
      if (!faucet.success && !faucet.skipped) {
        setStatus(
          faucet.error
            ? `Faucet: ${faucet.error}`
            : 'No se pudo obtener CELO.'
        )
        return
      }

      prepareWaapOverlayForWalletRequest()
      onProgress?.({ active: true, message: 'Registra tu .motus en Celo (confirma en wallet)…' })
      const reg = await registerMotusName(normalized, signing, provider)
      if (!reg.success) {
        setStatus(reg.error ? `Registro: ${reg.error}` : 'No se pudo registrar el nombre.')
        return
      }

      const txHash =
        reg.txHash ??
        (reg.alreadyRegistered ? `owned:${normalized}` : null)
      if (!txHash) {
        setStatus('No se obtuvo comprobante de transacción.')
        return
      }

      onRegistered({ mnsLabel: normalized, mnsTxHash: txHash })
      setStatus('✅ Dominio registrado.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Error al registrar.')
    } finally {
      releaseWaapOverlayInput()
      setBusy(false)
      onProgress?.({ active: false, message: null })
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs text-muted-foreground">
        Tu nombre <span className="text-mauve-400">.motus</span>
        <input
          className={fieldClass}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="analucia"
          disabled={disabled || busy}
          autoComplete="off"
        />
      </label>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      <CTAButton
        type="button"
        size="sm"
        className="w-full"
        disabled={disabled || busy || !walletAddress}
        onClick={() => void runMint()}
      >
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Registrando…
          </span>
        ) : (
          'Registrar .motus'
        )}
      </CTAButton>
      {!walletAddress ? (
        <p className={cn('text-[11px] text-muted-foreground')}>
          Inicia sesión en el paso anterior para firmar en Celo.
        </p>
      ) : null}
    </div>
  )
}