'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useWallet, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import { useSiweSession } from '@/lib/auth/use-siwe-session'

type HistoryItem = {
  txHash: string
  direction: 'sent' | 'received'
  symbol: string
  amount: string
  decimals: number
  from: string
  to: string
  timestamp: number
  status: 'confirmed' | 'failed'
  tokenAddress: string | null
  explorerUrl: string
}

type Tab = 'all' | 'sent' | 'received'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'sent', label: 'Enviados' },
  { id: 'received', label: 'Recibidos' },
]

function shortAddress(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function formatAmount(amount: string): string {
  if (!amount.includes('.')) return amount
  const [whole, fraction] = amount.split('.')
  const trimmed = fraction.slice(0, 6).replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

export default function HistorialPage() {
  const { ready, authenticated } = useWallet()
  const { wallets } = useWallets()
  const { isSessionReady, sessionState, signing, signIn } = useSiweSession()
  const address = getEOAAddress(wallets)

  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!address || !isSessionReady) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/onchain/history?address=${encodeURIComponent(address)}`,
        { credentials: 'include', cache: 'no-store' }
      )
      const data = (await response.json()) as { items?: HistoryItem[]; error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cargar el historial')
      }
      setItems(data.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [address, isSessionReady])

  useEffect(() => {
    void load()
  }, [load])

  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(hash)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      // Clipboard can be blocked; the Celoscan link is always available.
    }
  }

  const filtered = items.filter((item) => tab === 'all' || item.direction === tab)
  const sentCount = items.filter((item) => item.direction === 'sent').length
  const receivedCount = items.filter((item) => item.direction === 'received').length

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/pagos"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Pagos
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || !isSessionReady}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </button>
        </div>

        <GlassCard className="p-4 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Historial</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enviados y recibidos en Celo mainnet
              {address ? ` · ${shortAddress(address)}` : ''}
            </p>
          </div>

          {!ready ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-mauve-500" />
            </div>
          ) : !authenticated || !address ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Conecta tu wallet para ver tu historial.
              </p>
              <Link
                href="/pagos"
                className="mt-3 inline-block text-sm font-semibold text-mauve-300 underline"
              >
                Ir a Pagos
              </Link>
            </div>
          ) : !isSessionReady ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {sessionState === 'needs_signature'
                  ? 'Firma el mensaje para consultar tu historial.'
                  : 'Preparando tu sesión…'}
              </p>
              {sessionState === 'needs_signature' && (
                <button
                  type="button"
                  onClick={() => void signIn()}
                  disabled={signing}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-mauve-500/40 bg-mauve-500/15 px-4 py-2 text-sm font-semibold text-mauve-200 hover:bg-mauve-500/25 disabled:opacity-50"
                >
                  {signing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Firmar
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {TABS.map((entry) => {
                  const count =
                    entry.id === 'all'
                      ? items.length
                      : entry.id === 'sent'
                        ? sentCount
                        : receivedCount
                  const active = tab === entry.id
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setTab(entry.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-mauve-500/50 bg-mauve-500/15 text-mauve-200'
                          : 'border-white/10 text-muted-foreground hover:bg-white/5'
                      }`}
                    >
                      {entry.label} ({count})
                    </button>
                  )
                })}
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-mauve-500" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {tab === 'all'
                      ? 'Aún no tienes movimientos.'
                      : tab === 'sent'
                        ? 'Aún no has enviado nada.'
                        : 'Aún no has recibido nada.'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cuando compres wFIAT con Ripio o envíes cripto, aparecerán aquí.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((item) => {
                    const counterparty = item.direction === 'sent' ? item.to : item.from
                    const isReceived = item.direction === 'received'
                    return (
                      <li
                        key={`${item.txHash}:${item.tokenAddress ?? 'native'}`}
                        className="rounded-lg border border-white/10 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 rounded-full p-1.5 ${
                                isReceived
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-mauve-500/10 text-mauve-300'
                              }`}
                            >
                              {isReceived ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">
                                {isReceived ? '+' : '−'}
                                {formatAmount(item.amount)} {item.symbol}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isReceived ? 'De' : 'A'} {shortAddress(counterparty)} ·{' '}
                                {formatDate(item.timestamp)}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => void copyHash(item.txHash)}
                                  className="inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground"
                                  title={item.txHash}
                                >
                                  {copied === item.txHash ? (
                                    <>
                                      <Check className="h-3 w-3" /> Copiado
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      {item.txHash.slice(0, 10)}…{item.txHash.slice(-6)}
                                    </>
                                  )}
                                </button>
                                <a
                                  href={item.explorerUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-mauve-300 underline"
                                >
                                  Ver en Celoscan
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              item.status === 'failed'
                                ? 'bg-red-500/10 text-red-300'
                                : 'bg-green-500/10 text-green-300'
                            }`}
                          >
                            {item.status === 'failed' ? 'Fallida' : 'Confirmada'}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              <p className="mt-6 text-[11px] text-muted-foreground">
                Datos leídos de Celo mainnet vía Blockscout. El hash y el link a
                Celoscan son la prueba de cada movimiento.
              </p>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
