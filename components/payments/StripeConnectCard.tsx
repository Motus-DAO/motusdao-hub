'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { authFetch } from '@/lib/auth/client'
import { startStripeConnect } from '@/lib/stripe-connect-client'
import { CONNECT_PATHS, connectSectionHref } from '@/lib/stripe-connect-paths'

type ConnectStatus = {
  connected: boolean
  accountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  onboardingComplete: boolean
  requirementsDue: boolean
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
      const { url } = await startStripeConnect()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos abrir Stripe')
      setOpening(false)
    }
  }

  const feePercent = status ? status.feeBps / 100 : 10
  const dashboardHref = connectSectionHref('home', status?.accountId)
  const accountHref = connectSectionHref('account', status?.accountId)
  const needsAccountUpdate = Boolean(
    status?.chargesEnabled && (status.requirementsDue || !status.payoutsEnabled)
  )

  return (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold mb-2 flex items-center">
        <CreditCard className="w-5 h-5 mr-2 text-mauve-500" />
        Cobros con tarjeta
      </h3>
      <p className="text-sm text-muted-foreground">
        Stripe le cobra al paciente en tu cuenta. Motus se queda {feePercent}% de comisión. La
        comisión de la tarjeta la descuenta Stripe de tu parte, no de Motus. No necesitas entrar al
        Dashboard de Stripe: el panel de cobros vive aquí, en Motus.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Si cancelas con 48 horas o más de anticipación, Stripe devuelve el pago y la comisión.
        Dentro de esas 48 horas la cita se cancela y el pago se conserva.
      </p>
      {loading ? (
        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Revisando Stripe...
        </div>
      ) : status?.chargesEnabled ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-green-400">
            Ya puedes cobrar sesiones con tarjeta.
            {status.payoutsEnabled
              ? ' Los depósitos a tu banco están activos.'
              : ' Falta que Stripe active los depósitos a tu banco.'}
          </p>
          {needsAccountUpdate && (
            <p className="text-sm text-amber-400">
              Stripe necesita información adicional. Revísala en el panel para no perder la
              capacidad de cobrar o recibir depósitos.
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <CTAButton asChild variant={needsAccountUpdate ? 'secondary' : 'primary'}>
              <Link href={dashboardHref}>Abrir panel de cobros</Link>
            </CTAButton>
            {needsAccountUpdate && (
              <CTAButton asChild variant="secondary">
                <Link href={accountHref}>Revisar cuenta y banco</Link>
              </CTAButton>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <CTAButton onClick={connect} disabled={opening}>
            {opening
              ? 'Abriendo Stripe...'
              : status?.connected
                ? 'Terminar verificación en Stripe'
                : 'Conectar Stripe'}
          </CTAButton>
          {status?.connected && (
            <p className="text-xs text-muted-foreground">
              También puedes ver el aviso de Stripe en el{' '}
              <Link href={CONNECT_PATHS.home} className="text-mauve-300 underline-offset-2 hover:underline">
                panel de cobros
              </Link>
              .
            </p>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </GlassCard>
  )
}
