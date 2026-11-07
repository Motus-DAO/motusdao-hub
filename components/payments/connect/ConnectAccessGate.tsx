'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, AlertTriangle, CreditCard, LogIn, Shield, UserX } from 'lucide-react'
import { FeedbackDialog } from '@/components/ui/FeedbackDialog'
import { useWallet } from '@/lib/wallet'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import type { ConnectAccess } from '@/lib/stripe-connect-access'
import { ConnectOnboardingButton } from './ConnectOnboardingButton'

type BlockedAccess = Exclude<ConnectAccess, { kind: 'ready' }>

/**
 * Gate for Stripe's email links. The URL keeps `stripe_account_id`, so after
 * the therapist connects their wallet and signs, a router refresh re-runs the
 * server page with the new session and the embedded component mounts.
 */
export function ConnectAccessGate({ access }: { access: BlockedAccess }) {
  const router = useRouter()
  const { login } = useWallet()
  const { sessionState, signing, signError, eoaAddress, signIn } = useSiweSession()
  const refreshedRef = useRef(false)

  useEffect(() => {
    if (
      access.kind === 'unauthenticated' &&
      sessionState === 'ready' &&
      !refreshedRef.current
    ) {
      refreshedRef.current = true
      router.refresh()
    }
  }, [access.kind, sessionState, router])

  if (access.kind === 'unauthenticated') {
    const needsWallet = sessionState === 'no_wallet'
    const needsSignature = sessionState === 'needs_signature'

    return (
      <FeedbackDialog
        variant="warning"
        icon={LogIn}
        title="Entra para ver tus cobros"
        description="Stripe te envió aquí para revisar tu cuenta conectada. Conecta tu wallet y firma el mensaje para confirmar que eres tú."
        primaryAction={
          needsWallet
            ? {
                label: 'Conectar wallet',
                onClick: () => void login(),
              }
            : needsSignature
              ? {
                  label: signing ? 'Esperando firma...' : 'Firmar y entrar',
                  onClick: () => void signIn(),
                  loading: signing,
                  disabled: signing,
                }
              : {
                  label: 'Verificando sesión...',
                  onClick: () => {},
                  disabled: true,
                }
        }
        secondaryAction={{ label: 'Ir al inicio', onClick: () => router.push('/') }}
      >
        {eoaAddress && (
          <p className="break-all rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-muted-foreground">
            {eoaAddress}
          </p>
        )}
        {signError && (
          <p className="mt-3 flex items-start gap-2 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {signError}
          </p>
        )}
      </FeedbackDialog>
    )
  }

  if (access.kind === 'not_connected') {
    return (
      <FeedbackDialog
        variant="warning"
        icon={CreditCard}
        title="Aún no cobras con tarjeta"
        description="Conecta Stripe para que tus pacientes puedan pagar sus sesiones con tarjeta. Stripe verifica tu identidad, RFC y cuenta bancaria; Motus no custodia tu dinero."
        secondaryAction={{ label: 'Ir a mi perfil', onClick: () => router.push('/perfil') }}
      >
        <ConnectOnboardingButton className="w-full" />
      </FeedbackDialog>
    )
  }

  if (access.kind === 'not_psm') {
    return (
      <FeedbackDialog
        variant="warning"
        icon={UserX}
        title="Este panel es para profesionales"
        description="Tu cuenta no tiene un perfil de psicólogo verificado. Si eres profesional, completa tu registro y verificación."
        primaryAction={{ label: 'Ir a mi perfil', onClick: () => router.push('/perfil') }}
        secondaryAction={{ label: 'Ir al inicio', onClick: () => router.push('/') }}
      />
    )
  }

  if (access.kind === 'invalid_account') {
    return (
      <FeedbackDialog
        variant="error"
        icon={AlertTriangle}
        title="El enlace de Stripe no es válido"
        description="El enlace no incluye una cuenta conectada válida. Abre el panel desde tu perfil para revisar tu cuenta."
        primaryAction={{ label: 'Ir a mi perfil', onClick: () => router.push('/perfil') }}
        secondaryAction={{ label: 'Ir al inicio', onClick: () => router.push('/') }}
      />
    )
  }

  return (
    <FeedbackDialog
      variant="error"
      icon={Shield}
      title="La cuenta de Stripe no coincide"
      description="El enlace apunta a una cuenta conectada que no está vinculada a tu usuario. Inicia sesión con la cuenta correcta o revisa tu perfil."
      primaryAction={{ label: 'Ir a mi perfil', onClick: () => router.push('/perfil') }}
      secondaryAction={{ label: 'Ir al inicio', onClick: () => router.push('/') }}
    />
  )
}
