'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, LogIn, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FeedbackDialog } from '@/components/ui/FeedbackDialog'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import {
  profileAccessGateCopy,
  shouldShowCompleteRegistration,
  type ProfileAccessGateKind,
  type ProfileLoadErrorKind,
} from '@/lib/auth/hub-session'

const LOADING_STALL_MS = 8_000

type Props = {
  kind: Exclude<ProfileAccessGateKind, 'ready'>
  errorMessage?: string | null
  errorKind?: ProfileLoadErrorKind | null
  onLogin: () => void
  onRetry: () => void
}

export function ProfileAccessGate({
  kind,
  errorMessage,
  errorKind,
  onLogin,
  onRetry,
}: Props) {
  const router = useRouter()
  const { signing, signError, eoaAddress, signIn } = useSiweSession()
  const copy = profileAccessGateCopy(kind)
  const [loadingStalled, setLoadingStalled] = useState(false)
  const isLoadingKind =
    kind === 'wallet_loading' || kind === 'session_loading' || kind === 'profile_loading'

  useEffect(() => {
    if (!isLoadingKind) {
      setLoadingStalled(false)
      return
    }
    const timeout = window.setTimeout(() => setLoadingStalled(true), LOADING_STALL_MS)
    return () => window.clearTimeout(timeout)
  }, [isLoadingKind, kind])

  if (isLoadingKind) {
    return (
      <FeedbackDialog
        variant="loading"
        title={copy.title}
        description={
          loadingStalled
            ? 'Esto está tardando más de lo normal. Puedes reintentar o volver al inicio.'
            : copy.description
        }
        primaryAction={
          loadingStalled
            ? {
                label: 'Reintentar',
                onClick: () => {
                  if (kind === 'wallet_loading') {
                    window.location.reload()
                    return
                  }
                  onRetry()
                },
              }
            : undefined
        }
        secondaryAction={{ label: 'Ir al inicio', onClick: () => router.push('/') }}
      />
    )
  }

  if (kind === 'unauthenticated') {
    return (
      <FeedbackDialog
        variant="warning"
        icon={LogIn}
        title={copy.title}
        description={copy.description}
        primaryAction={{ label: 'Iniciar sesión', onClick: onLogin }}
        secondaryAction={{ label: 'Ir al inicio', onClick: () => router.push('/') }}
      />
    )
  }

  if (kind === 'needs_signature') {
    return (
      <FeedbackDialog
        variant="warning"
        icon={Shield}
        title={copy.title}
        description={copy.description}
        primaryAction={{
          label: signing ? 'Esperando firma en tu wallet…' : 'Firmar mensaje de verificación',
          onClick: () => void signIn(),
          loading: signing,
          disabled: signing,
        }}
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

  const allowRegister = shouldShowCompleteRegistration(errorKind ?? 'generic')

  return (
    <FeedbackDialog
      variant="error"
      icon={errorKind === 'unlinked' ? AlertTriangle : AlertCircle}
      title={copy.title}
      description={errorMessage || copy.description}
      primaryAction={
        allowRegister
          ? { label: 'Completar registro', onClick: () => router.push('/registro') }
          : { label: 'Reintentar', onClick: onRetry }
      }
      secondaryAction={{ label: 'Ir al inicio', onClick: () => router.push('/') }}
    />
  )
}
