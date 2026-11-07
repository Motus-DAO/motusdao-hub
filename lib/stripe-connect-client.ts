'use client'

import { authFetch } from '@/lib/auth/client'

type ConnectActionResponse = {
  url?: unknown
  error?: unknown
  detail?: unknown
  requestId?: unknown
  embedded?: unknown
}

/**
 * Starts (or resumes) Stripe onboarding for the signed-in therapist.
 *
 * The API returns either a Stripe-hosted onboarding URL or an internal
 * dashboard path when the account already charges and only needs embedded
 * account management.
 */
export async function startStripeConnect(): Promise<{
  url: string
  embedded: boolean
}> {
  const response = await authFetch('/api/stripe/connect', { method: 'POST' })
  const data = (await response.json().catch(() => ({}))) as ConnectActionResponse

  if (!response.ok) {
    const message =
      typeof data.error === 'string' ? data.error : 'No pudimos abrir Stripe.'
    const detail =
      typeof data.detail === 'string' && data.detail.length > 0 && data.detail !== message
        ? ` Detalle de Stripe: ${data.detail}`
        : ''
    const requestId =
      typeof data.requestId === 'string' && data.requestId.length > 0
        ? ` (${data.requestId})`
        : ''
    throw new Error(`${message}${detail}${requestId}`)
  }

  if (typeof data.url !== 'string' || data.url.length === 0) {
    throw new Error('Stripe no devolvió una URL.')
  }

  return { url: data.url, embedded: data.embedded === true }
}
