'use client'

import { authFetch } from '@/lib/auth/client'

type ConnectActionResponse = {
  url?: unknown
  error?: unknown
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
    throw new Error(
      typeof data.error === 'string' ? data.error : 'No pudimos abrir Stripe.'
    )
  }

  if (typeof data.url !== 'string' || data.url.length === 0) {
    throw new Error('Stripe no devolvió una URL.')
  }

  return { url: data.url, embedded: data.embedded === true }
}
