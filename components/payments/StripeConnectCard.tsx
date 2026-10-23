'use client'

import { useCallback, useEffect, useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { authFetch } from '@/lib/auth/client'

type ConnectStatus = {
  connected: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  feeBps: number
}

export function StripeConnectCard() {
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await authFetch('/api/stripe/connect')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos leer Stripe')
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos leer Stripe')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const connect = async () => {
    setOpening(true)
    setError(null)
    try {
      const response = await authFetch('/api/stripe/connect', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos abrir Stripe')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos abrir Stripe')
      setOpening(false)
    }
  }

  const feePercent = status ? status.feeBps / 100 : 10

  return (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold mb-2 flex items-center">
        <CreditCard className="w-5 h-5 mr-2 text-mauve-500" />
        Cobros con tarjeta
      </h3>
      <p className="text-sm text-muted-foreground">
        Stripe le cobra al paciente en tu cuenta. Motus se queda {feePercent}% de comisión. La comisión de la tarjeta la descuenta Stripe de tu parte, no de Motus.
      </p>
      {loading ? (
        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Revisando Stripe...
        </div>
      ) : status?.chargesEnabled ? (
        <p className="mt-4 text-sm text-green-400">
          Ya puedes cobrar sesiones con tarjeta.
          {status.payoutsEnabled ? ' Los depósitos a tu banco están activos.' : ' Falta que Stripe active los depósitos a tu banco.'}
        </p>
      ) : (
        <CTAButton className="mt-4" onClick={connect} disabled={opening}>
          {opening ? 'Abriendo Stripe...' : status?.connected ? 'Terminar verificación en Stripe' : 'Conectar Stripe'}
        </CTAButton>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </GlassCard>
  )
}
