'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Wallet } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { authFetch } from '@/lib/auth/client'

type Earning = {
  id: string
  scheduledStart: string
  grossCents: number
  feeCents: number
  netCents: number
}

type Earnings = {
  currency: 'usd'
  paidSessions: number
  grossCents: number
  feeCents: number
  netCents: number
  recent: Earning[]
}

const usd = (cents: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(cents / 100)

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })

export function StripeEarningsCard() {
  const [data, setData] = useState<Earnings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await authFetch('/api/stripe/connect/earnings')
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No pudimos leer tus ingresos')
      setData(body)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos leer tus ingresos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold mb-2 flex items-center">
        <Wallet className="w-5 h-5 mr-2 text-mauve-500" />
        Ingresos con tarjeta
      </h3>
      <p className="text-sm text-muted-foreground">
        Bruto, comisión Motus y neto antes de la comisión de procesamiento de Stripe. El depósito a tu
        banco lo hace Stripe.
      </p>

      {loading ? (
        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Calculando...
        </div>
      ) : error ? (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      ) : !data || data.paidSessions === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Aún no tienes sesiones cobradas con tarjeta. Cuando un paciente pague, verás aquí el bruto,
          la comisión de Motus y tu neto.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Bruto</p>
              <p className="text-lg font-semibold">{usd(data.grossCents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Comisión Motus</p>
              <p className="text-lg font-semibold">{usd(data.feeCents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Neto</p>
              <p className="text-lg font-semibold">{usd(data.netCents)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {data.paidSessions} {data.paidSessions === 1 ? 'sesión cobrada' : 'sesiones cobradas'}.
          </p>
          <ul className="mt-4 space-y-2">
            {data.recent.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between border-t border-white/5 pt-2 text-sm"
              >
                <span className="text-muted-foreground">{when(item.scheduledStart)}</span>
                <span className="font-medium">{usd(item.netCents)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </GlassCard>
  )
}
