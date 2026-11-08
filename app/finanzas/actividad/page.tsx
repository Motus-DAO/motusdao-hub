'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Loader2,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useWallet, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import type { ActivityItem, ActivityKind, ActivityStatus } from '@/lib/finance/activity'

type Filter = 'all' | 'wallet' | 'therapy' | 'academy'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'therapy', label: 'Terapia' },
  { id: 'academy', label: 'Academia' },
]

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  onchain_sent: ArrowUpRight,
  onchain_received: ArrowDownLeft,
  therapy_card: CreditCard,
  therapy_spei: Building2,
  academy: GraduationCap,
}

const STATUS_LABEL: Record<ActivityStatus, string> = {
  confirmed: 'Confirmado',
  pending: 'Pendiente',
  failed: 'Fallido',
  refunded: 'Reembolsado',
}

const STATUS_CLASS: Record<ActivityStatus, string> = {
  confirmed: 'bg-green-500/10 text-green-300',
  pending: 'bg-yellow-500/10 text-yellow-300',
  failed: 'bg-red-500/10 text-red-300',
  refunded: 'bg-slate-500/10 text-slate-300',
}

function matchesFilter(item: ActivityItem, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'wallet') return item.kind === 'onchain_sent' || item.kind === 'onchain_received'
  if (filter === 'therapy') return item.kind === 'therapy_card' || item.kind === 'therapy_spei'
  return item.kind === 'academy'
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

export default function ActividadPage() {
  const { ready, authenticated } = useWallet()
  const { wallets } = useWallets()
  const { isSessionReady, sessionState, signing, signIn } = useSiweSession()
  const address = getEOAAddress(wallets)

  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    if (!isSessionReady) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/finance/activity', {
        credentials: 'include',
        cache: 'no-store',
      })
      const data = (await response.json()) as { items?: ActivityItem[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar la actividad')
      setItems(data.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [isSessionReady])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = items.filter((item) => matchesFilter(item, filter))

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/finanzas"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Finanzas
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
            <h1 className="text-2xl font-bold">Actividad</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Movimientos de wallet, terapia y Academia en un solo lugar
            </p>
          </div>

          {!ready ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-mauve-500" />
            </div>
          ) : !authenticated || !address ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Conecta tu wallet para ver tu actividad.
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
                  ? 'Firma el mensaje para consultar tu actividad.'
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
                {FILTERS.map((entry) => {
                  const count = items.filter((item) => matchesFilter(item, entry.id)).length
                  const active = filter === entry.id
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setFilter(entry.id)}
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
                  <p className="text-sm text-muted-foreground">Aún no hay movimientos aquí.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cuando pagues una sesión, compres en Academia o muevas wFIAT, aparecerán en
                    esta lista.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((item) => {
                    const Icon = KIND_ICON[item.kind]
                    const isIncoming =
                      item.kind === 'onchain_received' || item.kind === 'therapy_card' || item.kind === 'therapy_spei'
                    return (
                      <li
                        key={item.id}
                        className="rounded-lg border border-white/10 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 rounded-full p-1.5 ${
                                isIncoming
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-mauve-500/10 text-mauve-300'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">
                                {item.title}
                                {item.amount && item.currency ? ` · ${item.amount} ${item.currency}` : ''}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.subtitle} · {formatDate(item.timestamp)}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
                                {item.explorerUrl && (
                                  <a
                                    href={item.explorerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-mauve-300 underline"
                                  >
                                    Ver en Celoscan
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                                {item.href && (
                                  <Link href={item.href} className="text-muted-foreground underline">
                                    Abrir
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[item.status]}`}
                          >
                            {STATUS_LABEL[item.status]}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              <p className="mt-6 text-[11px] text-muted-foreground">
                Wallet desde Celo mainnet (Blockscout); terapia desde tus pagos con tarjeta/SPEI;
                Academia desde tus compras. La persistencia propia llega en la fase 3 del ledger.
              </p>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
