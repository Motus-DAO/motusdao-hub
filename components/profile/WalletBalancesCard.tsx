'use client'

import { useCallback, useEffect, useState } from 'react'
import { Coins, Loader, LogOut, RefreshCw } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { authFetch } from '@/lib/auth/client'
import { logoutAppSession } from '@/lib/auth/client'
import { useWallet } from '@/lib/wallet'
import {
  PAYMENT_SESSION_P4_COPY,
  authProviderPaymentLabel,
} from '@/lib/payment-session-client'

type BalanceRow = {
  symbol: string
  balance: string
}

type WalletBalancesEntry = {
  id: string
  address: string
  isPrimary: boolean
  isSessionWallet: boolean
  balances: BalanceRow[]
  error: string | null
}

type BalancesResponse = {
  sessionEoa: string
  sessionAuthProvider: string | null
  wallets: WalletBalancesEntry[]
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatBalance(raw: string): string {
  const n = parseFloat(raw)
  if (!Number.isFinite(n) || n === 0) return '0'
  return n.toLocaleString('es-MX', {
    maximumFractionDigits: n < 1 ? 6 : 4,
  })
}

export function WalletBalancesCard() {
  const { logout } = useWallet()
  const [data, setData] = useState<BalancesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/wallets/balances')
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'No se pudieron cargar los saldos')
      }
      const json = (await res.json()) as BalancesResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar saldos')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleChangeSession = async () => {
    await logoutAppSession()
    await logout()
    window.location.reload()
  }

  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-mauve-400" />
          <h3 className="text-lg font-semibold">Saldos (solo lectura)</h3>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        Los pagos on-chain salen solo de la wallet de tu sesión actual, no de otras
        vinculadas.
      </p>

      {loading && !data ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader className="h-4 w-4 animate-spin" />
          Consultando Celo…
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {data?.wallets.length ? (
        <ul className="space-y-3">
          {data.wallets.map((wallet) => {
            const isSession = wallet.isSessionWallet
            return (
              <li
                key={wallet.id}
                className="rounded-xl border border-border px-3 py-3 text-sm space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2 font-mono">
                  <span>{shorten(wallet.address)}</span>
                  {wallet.isPrimary ? (
                    <span className="rounded bg-mauve-500/20 px-1.5 text-xs text-mauve-300">
                      primaria
                    </span>
                  ) : null}
                  {isSession ? (
                    <span className="rounded bg-green-500/15 px-1.5 text-xs text-green-300">
                      Sesión actual
                    </span>
                  ) : null}
                </div>

                {wallet.error ? (
                  <p className="text-xs text-amber-400">{wallet.error}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
                    {wallet.balances.map((row) => (
                      <div key={row.symbol} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{row.symbol}</span>
                        <span className="font-mono tabular-nums">
                          {formatBalance(row.balance)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {!isSession ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {PAYMENT_SESSION_P4_COPY}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      {data?.sessionEoa ? (
        <p className="text-xs text-muted-foreground">
          Pagos activos:{' '}
          <span className="font-mono">{shorten(data.sessionEoa)}</span> (
          {authProviderPaymentLabel(data.sessionAuthProvider)})
        </p>
      ) : null}

      <CTAButton
        type="button"
        size="sm"
        variant="secondary"
        className="w-full sm:w-auto"
        onClick={() => void handleChangeSession()}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Cambiar sesión (otra wallet)
      </CTAButton>
    </GlassCard>
  )
}

export function PaymentSessionHint({
  sessionEoa,
  sessionAuthProvider,
  className,
}: {
  sessionEoa: string | null
  sessionAuthProvider: string | null
  className?: string
}) {
  if (!sessionEoa) return null
  return (
    <p className={`text-sm text-muted-foreground ${className ?? ''}`}>
      Pagarás desde{' '}
      <span className="font-mono text-foreground">
        {sessionEoa.slice(0, 6)}…{sessionEoa.slice(-4)}
      </span>{' '}
      ({authProviderPaymentLabel(sessionAuthProvider)})
    </p>
  )
}