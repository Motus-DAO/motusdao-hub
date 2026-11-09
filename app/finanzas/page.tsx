'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CreditCard,
  GraduationCap,
  LayoutGrid,
  Loader2,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { useUIStore } from '@/lib/store'
import { useWallet, useWallets } from '@/lib/wallet'
import { getEOAAddress } from '@/lib/wallet-utils'
import type {
  ActivityItem,
  ActivityKind,
  ActivityStatus,
} from '@/lib/finance/activity'

type Method = 'all' | 'wallet' | 'stripe' | 'spei'

const METHOD_TILES: {
  id: Method
  label: string
  hint: string
  icon: LucideIcon
  href: string | null
}[] = [
  { id: 'all', label: 'Todo', hint: 'Todo tu dinero en un solo lugar', icon: LayoutGrid, href: null },
  { id: 'wallet', label: 'Wallet', hint: 'wMXN · USDT · autocustodia', icon: Wallet, href: '/pagos' },
  { id: 'stripe', label: 'Stripe', hint: 'Tarjeta · Stripe Connect', icon: CreditCard, href: '/cobros' },
  { id: 'spei', label: 'SPEI', hint: 'CLABE · transferencia bancaria', icon: Building2, href: '/finanzas/depositos' },
]

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  onchain_sent: ArrowUpRight,
  onchain_received: ArrowDownLeft,
  therapy_card: CreditCard,
  therapy_spei: Building2,
  therapy_escrow: Wallet,
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

function railOf(kind: ActivityKind): Exclude<Method, 'all'> {
  if (kind === 'therapy_card' || kind === 'academy') return 'stripe'
  if (kind === 'therapy_spei') return 'spei'
  return 'wallet'
}

function railLabel(kind: ActivityKind): string {
  if (kind === 'therapy_escrow') return 'Escrow'
  if (kind === 'therapy_card' || kind === 'academy') return 'Stripe'
  if (kind === 'therapy_spei') return 'SPEI'
  return 'Wallet'
}

function shortAddress(value: string): string {
  return value.length <= 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

export default function ResumenPage() {
  const { role } = useUIStore()
  const isPsm = role !== 'usuario'
  const { authenticated, login } = useWallet()
  const { wallets } = useWallets()
  const { isSessionReady, sessionState, signing, signIn } = useSiweSession()
  const address = getEOAAddress(wallets)

  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<Method>('all')

  useEffect(() => {
    if (!isSessionReady) return
    let cancelled = false
    setLoading(true)
    void fetch('/api/finance/activity')
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          items?: ActivityItem[]
          error?: string
        }
        if (!response.ok) throw new Error(body.error || 'No se pudo cargar el resumen.')
        if (!cancelled) {
          setItems(body.items || [])
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isSessionReady])

  const counts = useMemo(() => {
    const base = { all: items.length, wallet: 0, stripe: 0, spei: 0 }
    for (const item of items) base[railOf(item.kind)] += 1
    return base
  }, [items])

  const filtered = useMemo(
    () => (method === 'all' ? items : items.filter((item) => railOf(item.kind) === method)),
    [items, method]
  )

  const enEscrow = items.filter(
    (item) => item.kind === 'therapy_escrow' && item.status === 'pending'
  ).length

  if (!authenticated) {
    return (
      <div className="min-h-screen py-12">
        <div className="mx-auto max-w-xl px-4">
          <GlassCard className="p-8 text-center">
            <h1 className="text-2xl font-bold">Resumen</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Conecta tu wallet para ver tus métodos, saldos y movimientos.
            </p>
            <CTAButton className="mt-5 w-full" onClick={() => void login()}>
              Conectar WaaP
            </CTAButton>
          </GlassCard>
        </div>
      </div>
    )
  }

  if (sessionState === 'needs_signature') {
    return (
      <div className="min-h-screen py-12">
        <div className="mx-auto max-w-xl px-4">
          <GlassCard className="p-8 text-center">
            <h1 className="text-2xl font-bold">Resumen</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Firma el mensaje para cargar tus movimientos.
            </p>
            <CTAButton
              className="mt-5 w-full"
              disabled={signing}
              onClick={() => void signIn()}
            >
              {signing ? 'Firmando…' : 'Firmar sesión'}
            </CTAButton>
          </GlassCard>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Resumen</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Todo tu dinero y los tres métodos, en un solo lugar.
              {address ? ` · ${shortAddress(address)}` : ''}
            </p>
          </div>
          {isPsm && (
            <Link
              href="/pagos/sesiones"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/5"
            >
              <Calendar className="h-4 w-4" />
              Sesiones
            </Link>
          )}
        </div>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Métodos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {METHOD_TILES.map((tile) => {
            const Icon = tile.icon
            const active = method === tile.id
            const count = counts[tile.id]
            return (
              <div
                key={tile.id}
                role="button"
                tabIndex={0}
                onClick={() => setMethod(tile.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setMethod(tile.id)
                  }
                }}
                className="cursor-pointer"
              >
                <GlassCard
                  className={`h-full p-5 transition-colors ${
                    active ? 'border-mauve-500/60 bg-mauve-500/10' : 'hover:border-mauve-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-xl bg-mauve-500/10 p-2 text-mauve-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted-foreground">
                      {count} {count === 1 ? 'movimiento' : 'movimientos'}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{tile.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{tile.hint}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-xs ${active ? 'text-mauve-200' : 'text-muted-foreground'}`}>
                      {active ? 'Filtrando resumen' : 'Ver resumen'}
                    </span>
                    {tile.href && (tile.id === 'wallet' || isPsm) && (
                      <Link
                        href={tile.href}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-mauve-300 hover:text-mauve-200"
                      >
                        Abrir
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </GlassCard>
              </div>
            )
          })}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground">Movimientos</p>
            <p className="mt-1 text-2xl font-bold">{filtered.length}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground">En escrow</p>
            <p className="mt-1 text-2xl font-bold">{enEscrow}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground">Wallet</p>
            <p className="mt-1 text-2xl font-bold">{counts.wallet}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs text-muted-foreground">Stripe</p>
            <p className="mt-1 text-2xl font-bold">{counts.stripe}</p>
          </GlassCard>
        </div>

        <GlassCard className="mt-6 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Actividad</h2>
            <Link
              href="/finanzas/actividad"
              className="text-xs font-semibold text-mauve-300 hover:text-mauve-200"
            >
              Ver toda
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-mauve-500" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-red-300">{error}</p>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No hay movimientos en {method === 'all' ? 'tu cuenta' : METHOD_TILES.find((t) => t.id === method)?.label}.
              </p>
              {method !== 'all' && (
                <button
                  type="button"
                  onClick={() => setMethod('all')}
                  className="mt-2 text-xs font-semibold text-mauve-300 hover:text-mauve-200"
                >
                  Ver todos los métodos
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.slice(0, 8).map((item) => {
                const Icon = KIND_ICON[item.kind]
                const incoming = item.direction
                  ? item.direction === 'in'
                  : item.kind === 'onchain_received' ||
                    item.kind === 'therapy_card' ||
                    item.kind === 'therapy_spei'
                const href = item.href || '/finanzas/actividad'
                return (
                  <li key={item.id}>
                    <Link
                      href={href}
                      className="flex items-start justify-between gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:border-mauve-500/30"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 rounded-full bg-mauve-500/10 p-1.5 text-mauve-300">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium">{item.title}</p>
                            <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {railLabel(item.kind)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {item.subtitle} · {formatDate(item.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`text-sm font-semibold ${
                            incoming ? 'text-green-300' : 'text-foreground'
                          }`}
                        >
                          {item.amount ? `${incoming ? '+' : '−'}${item.amount}` : '—'}
                          {item.currency ? ` ${item.currency}` : ''}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            STATUS_CLASS[item.status]
                          }`}
                        >
                          {STATUS_LABEL[item.status]}
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
