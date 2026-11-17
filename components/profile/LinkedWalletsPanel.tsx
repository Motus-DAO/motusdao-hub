'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link2, Loader, Plus, Trash2, Wallet } from 'lucide-react'
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
import {
  endWalletLinkMode,
  resetWalletLinkMode,
  startWalletLinkMode,
} from '@/lib/auth/wallet-link-mode'
import { useThirdwebFallback } from '@/lib/wallet/thirdweb-fallback-context'
import { isThirdwebFallbackEnabled } from '@/lib/wallet/config'

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function LinkedWalletsPanel() {
  const { wallets: walletList } = useWallets()
  const { provider } = useWalletProvider()
  const thirdweb = useThirdwebFallback()
  const activeEoa = getEOAAddress(walletList)
  const [rows, setRows] = useState<LinkedWalletDto[]>([])
  const [sessionEoa, setSessionEoa] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addFlowOpen, setAddFlowOpen] = useState(false)
  const [pendingLinkAddress, setPendingLinkAddress] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLinkedWallets()
      setRows(data.wallets)
      setSessionEoa(data.sessionEoa)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar wallets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    return () => {
      resetWalletLinkMode()
    }
  }, [reload])

  const linkAddress = async (eoa: string, linkProvider: unknown) => {
    if (!linkProvider) {
      throw new Error('Wallet no lista para firmar. Intenta de nuevo.')
    }
    await linkWalletWithSiwe(linkProvider, eoa)
    await reload()
  }

  const finishAddFlow = useCallback(async () => {
    setAddFlowOpen(false)
    setPendingLinkAddress(null)
    endWalletLinkMode()
    try {
      await thirdweb.clearThirdwebFallback()
    } catch {
      // best effort
    }
  }, [thirdweb])

  const handleLinkCurrent = async () => {
    if (!provider || !activeEoa) {
      setError('Conecta la wallet que quieres vincular.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await linkAddress(activeEoa, provider)
      await finishAddFlow()
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

  const handleStartAddWallet = async () => {
    setError(null)
    if (!isThirdwebFallbackEnabled()) {
      setError(
        'Para vincular otra wallet necesitas Thirdweb (NEXT_PUBLIC_THIRDWEB_CLIENT_ID).'
      )
      return
    }
    startWalletLinkMode()
    setAddFlowOpen(true)
    setBusy(true)
    try {
      await thirdweb.connectWithThirdweb()
    } catch (err) {
      await finishAddFlow()
      setError(err instanceof Error ? err.message : 'No se pudo abrir Thirdweb')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!addFlowOpen || !thirdweb.address || busy) return
    const addr = thirdweb.address
    if (rows.some((r) => r.address.toLowerCase() === addr.toLowerCase())) {
      setError('Esa wallet ya está vinculada a tu cuenta.')
      void finishAddFlow()
      return
    }
    setPendingLinkAddress(addr)
  }, [addFlowOpen, thirdweb.address, rows, busy, finishAddFlow])

  const confirmPendingLink = async () => {
    if (!pendingLinkAddress) return
    const linkProvider = thirdweb.eip1193Provider ?? provider
    setBusy(true)
    setError(null)
    try {
      await linkAddress(pendingLinkAddress, linkProvider)
      await finishAddFlow()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vincular')
    } finally {
      setBusy(false)
    }
  }

  const showLinkConnected =
    Boolean(activeEoa) &&
    !rows.some((r) => r.address.toLowerCase() === activeEoa!.toLowerCase())

  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-mauve-400" />
          <h3 className="text-lg font-semibold">Wallets vinculadas</h3>
        </div>
        <CTAButton
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy || loading}
          onClick={() => void handleStartAddWallet()}
          className="shrink-0"
        >
          {busy && addFlowOpen ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Conectando…
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Añadir otra wallet
            </>
          )}
        </CTAButton>
      </div>
      <p className="text-sm text-muted-foreground">
        Tu cuenta es una sola (<strong>userId</strong>). Con <strong>Añadir otra wallet</strong>{' '}
        abres Thirdweb, firmas SIWE con esa dirección y queda vinculada. Tu sesión actual (Human)
        no se pierde durante el paso.
      </p>

      {addFlowOpen && pendingLinkAddress ? (
        <div className="rounded-xl border border-mauve-500/30 bg-mauve-500/10 px-3 py-3 text-sm space-y-2">
          <p>
            Wallet detectada:{' '}
            <span className="font-mono">{shorten(pendingLinkAddress)}</span>
          </p>
          <CTAButton
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void confirmPendingLink()}
          >
            {busy ? 'Firmando…' : 'Firmar SIWE y vincular'}
          </CTAButton>
          <button
            type="button"
            className="block text-xs text-muted-foreground underline"
            onClick={() => void finishAddFlow()}
          >
            Cancelar
          </button>
        </div>
      ) : null}

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
                {sessionEoa &&
                row.address.toLowerCase() === sessionEoa.toLowerCase() ? (
                  <span className="rounded bg-green-500/15 px-1.5 text-xs text-green-300">
                    Sesión actual
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

      {showLinkConnected ? (
        <CTAButton
          type="button"
          size="sm"
          disabled={busy || !provider}
          onClick={() => void handleLinkCurrent()}
          className="w-full sm:w-auto"
        >
          {busy ? 'Firmando…' : `Vincular wallet conectada (${shorten(activeEoa!)})`}
        </CTAButton>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </GlassCard>
  )
}