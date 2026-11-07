'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js'
import { ConnectComponentsProvider } from '@stripe/react-connect-js'
import { getStripeConnectPublishableKey } from '@/lib/stripe-connect-paths'

const CONNECT_APPEARANCE = {
  overlays: 'dialog' as const,
  variables: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    colorPrimary: '#a855f7',
    colorBackground: '#0b0b0f',
    colorText: '#f4f4f5',
    colorSecondaryText: '#a1a1aa',
    colorDanger: '#f87171',
    colorBorder: '#27272a',
    buttonPrimaryColorBackground: '#a855f7',
    buttonPrimaryColorBorder: '#a855f7',
    buttonPrimaryColorText: '#ffffff',
    buttonSecondaryColorBackground: '#18181b',
    buttonSecondaryColorBorder: '#3f3f46',
    buttonSecondaryColorText: '#f4f4f5',
    actionPrimaryColorText: '#c084fc',
    offsetBackgroundColor: '#18181b',
    formBackgroundColor: '#0b0b0f',
    overlayBackdropColor: 'rgba(0,0,0,0.6)',
    badgeNeutralColorBackground: '#18181b',
    badgeNeutralColorBorder: '#27272a',
    badgeNeutralColorText: '#a1a1aa',
    badgeSuccessColorBackground: '#052e16',
    badgeSuccessColorBorder: '#14532d',
    badgeSuccessColorText: '#4ade80',
    badgeWarningColorBackground: '#422006',
    badgeWarningColorBorder: '#713f12',
    badgeWarningColorText: '#fbbf24',
    badgeDangerColorBackground: '#450a0a',
    badgeDangerColorBorder: '#7f1d1d',
    badgeDangerColorText: '#f87171',
    borderRadius: '12px',
  },
}

let cachedInstance: StripeConnectInstance | null = null
let cachedAccountId: string | null = null
let pendingClientSecret: string | null = null

async function fetchAccountSessionClientSecret(accountId: string): Promise<string> {
  const response = await fetch('/api/stripe/connect/account-session', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  })

  const data = (await response.json().catch(() => ({}))) as {
    clientSecret?: unknown
    error?: unknown
  }

  if (!response.ok || typeof data.clientSecret !== 'string') {
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : 'No pudimos abrir el panel de Stripe.'
    )
  }

  return data.clientSecret
}

function getCachedConnectInstance(accountId: string): StripeConnectInstance | null {
  return cachedInstance && cachedAccountId === accountId ? cachedInstance : null
}

/**
 * Connect.js recommends a single instance per browser session. Pages in
 * `/cobros` are separate App Router routes, so the instance is cached at module
 * level and reused while the same connected account stays selected.
 */
function getConnectInstance(
  accountId: string,
  publishableKey: string,
  firstClientSecret: string
): StripeConnectInstance {
  if (cachedInstance && cachedAccountId === accountId) {
    return cachedInstance
  }

  pendingClientSecret = firstClientSecret
  cachedInstance = loadConnectAndInitialize({
    publishableKey,
    fetchClientSecret: async () => {
      if (pendingClientSecret) {
        const secret = pendingClientSecret
        pendingClientSecret = null
        return secret
      }
      return fetchAccountSessionClientSecret(accountId)
    },
    locale: 'es-MX',
    appearance: CONNECT_APPEARANCE,
  })
  cachedAccountId = accountId
  return cachedInstance
}

type ConnectProviderProps = {
  accountId: string
  children: ReactNode
}

export function ConnectProvider({ accountId, children }: ConnectProviderProps) {
  // Keying by account resets the instance state if the URL ever points at a
  // different connected account without a full page load.
  return (
    <ConnectProviderInner key={accountId} accountId={accountId}>
      {children}
    </ConnectProviderInner>
  )
}

function ConnectProviderInner({ accountId, children }: ConnectProviderProps) {
  const publishableKey = getStripeConnectPublishableKey()
  const [instance, setInstance] = useState<StripeConnectInstance | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  if (!publishableKey) {
    return (
      <ConnectSetupError message="Falta configurar NEXT_PUBLIC_STRIPE_CONNECT_PUBLISHABLE_KEY (llave pública de la cuenta MotusDAO-Connect)." />
    )
  }

  if (error) {
    return (
      <ConnectSetupError
        message={error}
        onRetry={() => {
          cachedInstance = null
          cachedAccountId = null
          pendingClientSecret = null
          setError(null)
          setAttempt((value) => value + 1)
        }}
      />
    )
  }

  if (!instance) {
    return (
      <ConnectInitializer
        accountId={accountId}
        publishableKey={publishableKey}
        attempt={attempt}
        onReady={setInstance}
        onError={setError}
      />
    )
  }

  return (
    <ConnectComponentsProvider connectInstance={instance}>
      {children}
    </ConnectComponentsProvider>
  )
}

function ConnectInitializer({
  accountId,
  publishableKey,
  attempt,
  onReady,
  onError,
}: {
  accountId: string
  publishableKey: string
  attempt: number
  onReady: (instance: StripeConnectInstance) => void
  onError: (message: string) => void
}) {
  useEffect(() => {
    let cancelled = false

    const cached = getCachedConnectInstance(accountId)
    if (cached) {
      onReady(cached)
      return
    }

    void (async () => {
      try {
        // Preflight the AccountSession so configuration errors (missing live
        // site links, wrong key) show a clear message instead of a generic
        // component error.
        const clientSecret = await fetchAccountSessionClientSecret(accountId)
        if (cancelled) return
        onReady(getConnectInstance(accountId, publishableKey, clientSecret))
      } catch (err) {
        if (cancelled) return
        onError(
          err instanceof Error ? err.message : 'No pudimos abrir el panel de Stripe.'
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accountId, publishableKey, attempt, onReady, onError])

  return (
    <div className="flex min-h-[14rem] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-mauve-500 border-t-transparent" />
        Abriendo el panel de Stripe...
      </div>
    </div>
  )
}

function ConnectSetupError({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
      <p className="text-sm font-medium text-red-300">No pudimos abrir el panel de Stripe.</p>
      <p className="mt-1 text-xs text-red-200/80">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/20"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
