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
type Direction = 'all' | 'in' | 'out'

type MethodsState = {
  mode?: 'pay' | 'collect'
  wallet: { active: boolean; address: string | null }
  ripio: { active: boolean; recommended: boolean; country: string; token: string }
  stripe: { active: boolean }
  spei: { active: boolean }
}

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

const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'in', label: 'Ingresos' },
  { id: 'out', label: 'Egresos' },
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

function itemDirection(item: ActivityItem): 'in' | 'out' {
  if (item.direction) return item.direction
  if (
    item.kind === 'onchain_received' ||
    item.kind === 'therapy_card' ||
    item.kind === 'therapy_spei'
  ) {
    return 'in'
  }
  return 'out'
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
  const [direction, setDirection] = useState<Direction>('all')
  const [methods, setMethods] = useState<MethodsState | null>(null)

  useEffect(() => {
    if (!isPsm && direction === 'in') setDirection('all')
  }, [isPsm, direction])

  useEffect(() => {
    if (!isSessionReady) return
    let cancelled = false
    const loadMethods = () => {
      void fetch('/api/finance/methods')
        .then(async (response) => {
          if (!response.ok) return
          const body = (await response.json().catch(() => null)) as MethodsState | null
          if (!cancelled && body) setMethods(body)
        })
        .catch(() => {
          // The tiles still work; status is best effort.
        })
    }
    loadMethods()
    const onFocus = () => loadMethods()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [isSessionReady])

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
    () =>
      items.filter((item) => {
        if (method !== 'all' && railOf(item.kind) !== method) return false
        if (direction !== 'all' && itemDirection(item) !== direction) return false
        return true
      }),
    [items, method, direction]
  )

  const enEscrow = items.filter(
    (item) => item.kind === 'therapy_escrow' && item.status === 'pending'
  ).length

  const emptyState: {
    title: string
    action?: { label: string; href: string }
  } = (() => {
    const money = direction === 'in' ? 'ingresos' : 'egresos'
    if (!isPsm) {
      if (method === 'stripe') {
        return {
          title:
            direction === 'all'
              ? 'Aún no has pagado con tarjeta.'
              : 'No hay egresos con tarjeta.',
          action: { label: 'Pagar sesión', href: '/psicoterapia' },
        }
      }
      if (method === 'spei') {
        return {
          title:
            direction === 'all'
              ? 'Aún no has pagado por SPEI.'
              : 'No hay egresos por SPEI.',
          action: { label: 'Cómo pagar', href: '/psicoterapia' },
        }
      }
      if (method === 'wallet') {
        return {
          title: 'Aún no hay movimientos en tu wallet.',
          action: { label: 'Abrir wallet', href: '/pagos' },
        }
      }
      return {
        title: 'Aún no hay pagos.',
        action: { label: 'Pagar sesión', href: '/psicoterapia' },
      }
    }
    if (method === 'spei') {
      if (methods && !methods.spei.active && isPsm) {
        return {
          title:
            'SPEI aún no está activo. Configura tu CLABE para recibir transferencias.',
          action: { label: 'Configurar CLABE', href: '/finanzas/depositos' },
        }
      }
      return {
        title:
          direction === 'all'
            ? 'Aún no hay depósitos SPEI.'
            : `No hay ${money} en SPEI.`,
      }
    }
    if (method === 'stripe') {
      if (methods && !methods.stripe.active && isPsm) {
        return {
          title:
            'Stripe aún no está conectado. Actívalo para cobrar con tarjeta.',
          action: { label: 'Configurar Stripe', href: '/cobros/cuenta' },
        }
      }
      return {
        title:
          direction === 'all'
            ? 'Aún no hay cobros con tarjeta.'
            : `No hay ${money} con tarjeta.`,
      }
    }
    if (method === 'wallet') {
      return {
        title:
          direction === 'all'
            ? 'Aún no hay movimientos en tu wallet.'
            : `No hay ${money} en tu wallet.`,
        action: { label: 'Abrir wallet', href: '/pagos' },
      }
    }
    return {
      title:
        direction === 'all'
          ? 'Aún no hay movimientos.'
          : `No hay ${money} en tu cuenta.`,
    }
  })()

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
            <h1 className="text-3xl font-bold">{isPsm ? 'Resumen' : 'Pagos'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPsm
                ? 'Todo tu dinero y los tres métodos, en un solo lugar.'
                : 'Tus formas de pago y lo que has pagado.'}
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
          {isPsm ? 'Métodos' : 'Formas de pago'}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {METHOD_TILES.map((tile) => {
            const Icon = tile.icon
            const selected = method === tile.id
            const count = counts[tile.id]
            const configured = !isPsm
              ? tile.id === 'all'
                ? null
                : true
              : tile.id === 'all'
                ? null
                : tile.id === 'wallet'
                  ? true
                  : methods?.[tile.id]?.active === true
            const action = !isPsm
              ? tile.id === 'wallet'
                ? { label: 'Abrir', href: '/pagos' }
                : tile.id === 'stripe'
                  ? { label: 'Pagar sesión', href: '/psicoterapia' }
                  : tile.id === 'spei'
                    ? { label: 'Cómo pagar', href: '/psicoterapia' }
                    : null
              : tile.id === 'wallet'
                ? { label: 'Abrir', href: '/pagos' }
                : tile.id === 'stripe'
                  ? configured
                    ? { label: 'Abrir', href: '/cobros' }
                    : { label: 'Configurar', href: '/cobros/cuenta' }
                  : tile.id === 'spei'
                    ? configured
                      ? { label: 'Abrir', href: '/finanzas/depositos' }
                      : { label: 'Configurar CLABE', href: '/perfil' }
                    : null
            const displayLabel =
              !isPsm && tile.id === 'stripe' ? 'Tarjeta' : tile.label
            const displayHint = !isPsm
              ? tile.id === 'all'
                ? 'Todo lo que has pagado'
                : tile.id === 'wallet'
                  ? 'Tu saldo on-chain · compra wMXN con Ripio'
                  : tile.id === 'stripe'
                    ? 'Paga en el checkout de tu sesión'
                    : 'Transferencia al CLABE del profesional'
              : tile.hint
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
                    selected ? 'border-mauve-500/60 bg-mauve-500/10' : 'hover:border-mauve-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-xl bg-mauve-500/10 p-2 text-mauve-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex items-center gap-2">
                      {configured !== null && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            configured
                              ? 'bg-green-500/10 text-green-300'
                              : 'bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          {!isPsm ? 'Disponible' : configured ? 'Activo' : 'Configurar'}
                        </span>
                      )}
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted-foreground">
                        {count} {count === 1 ? 'movimiento' : 'movimientos'}
                      </span>
                    </div>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{displayLabel}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{displayHint}</p>
                  {tile.id === 'wallet' && methods?.ripio.recommended && (
                    <p className="mt-1 text-[11px] text-emerald-300">
                      Ripio: la ruta más sencilla para comprar wMXN
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-xs ${selected ? 'text-mauve-200' : 'text-muted-foreground'}`}>
                      {selected ? 'Filtrando' : isPsm ? 'Ver resumen' : 'Ver pagos'}
                    </span>
                    {action && (isPsm || tile.id !== 'all') && (
                      <Link
                        href={action.href}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-mauve-300 hover:text-mauve-200"
                      >
                        {action.label}
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
            <p className="text-xs text-muted-foreground">{isPsm ? 'Movimientos' : 'Pagos'}</p>
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
            <p className="text-xs text-muted-foreground">{isPsm ? 'Stripe' : 'Tarjeta'}</p>
            <p className="mt-1 text-2xl font-bold">{counts.stripe}</p>
          </GlassCard>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dirección
            </span>
            <div className="flex rounded-xl border border-white/10 p-1">
              {(isPsm ? DIRECTIONS : DIRECTIONS.filter((item) => item.id !== 'in')).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDirection(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    direction === item.id
                      ? 'bg-mauve-500/20 text-mauve-200'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {direction === 'all'
              ? 'Ingresos y egresos'
              : direction === 'in'
                ? 'Solo ingresos'
                : 'Solo egresos'}
          </p>
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
              <p className="text-sm text-muted-foreground">{emptyState.title}</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                {emptyState.action && (
                  <Link
                    href={emptyState.action.href}
                    className="text-xs font-semibold text-mauve-300 hover:text-mauve-200"
                  >
                    {emptyState.action.label}
                  </Link>
                )}
                {method !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setMethod('all')}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Ver todos los métodos
                  </button>
                )}
              </div>
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
