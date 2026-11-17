'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link2, Loader, Trash2, Wallet } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useWalletProvider, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import {
  fetchLinkedWallets,
  linkWalletWithSiwe,
  unlinkWalletWithSiwe,
  type LinkedWalletDto,
} from '@/lib/auth/link-wallet-client'
import { ThirdwebFallbackLink } from '@/components/wallet/ThirdwebFallbackLink'

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function LinkedWalletsPanel() {
  const { wallets: walletList } = useWallets()
  const { provider } = useWalletProvider()
  const activeEoa = getEOAAddress(walletList)
  const [rows, setRows] = useState<LinkedWalletDto[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLinkedWallets()
      setRows(data.wallets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar wallets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleLinkCurrent = async () => {
    if (!provider || !activeEoa) {
      setError('Conecta la wallet que quieres vincular (usa «otra wallet» si hace falta).')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await linkWalletWithSiwe(provider, activeEoa)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vincular')
    } finally {
      setBusy(false)
    }
  }

  const handleUnlink = async (address: string) => {
    if (!provider) return
    setBusy(true)
    setError(null)
    try {
      await unlinkWalletWithSiwe(provider, address)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desvincular')
    } finally {
      setBusy(false)
    }
  }

  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-mauve-400" />
        <h3 className="text-lg font-semibold">Wallets vinculadas</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Tu cuenta es una sola (<strong>userId</strong>). Cada wallet extra debe firmar SIWE para
        vincularse; después puedes entrar con cualquiera de ellas.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader className="h-4 w-4 animate-spin" />
          Cargando…
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 font-mono">
                <Wallet className="h-4 w-4 shrink-0" />
                <span>{shorten(row.address)}</span>
                {row.isPrimary ? (
                  <span className="rounded bg-mauve-500/20 px-1.5 text-xs text-mauve-300">
                    primaria
                  </span>
                ) : null}
              </div>
              {!row.isPrimary && rows.length > 1 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleUnlink(row.address)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                >
                  <Trash2 className="h-3 w-3" />
                  Quitar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {activeEoa &&
      !rows.some((r) => r.address.toLowerCase() === activeEoa.toLowerCase()) ? (
        <CTAButton
          type="button"
          size="sm"
          disabled={busy || !provider}
          onClick={() => void handleLinkCurrent()}
          className="w-full sm:w-auto"
        >
          {busy ? 'Firmando…' : `Vincular wallet conectada (${shorten(activeEoa)})`}
        </CTAButton>
      ) : null}

      <ThirdwebFallbackLink className="text-left" />

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </GlassCard>
  )
}