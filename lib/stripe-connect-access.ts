import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { getStripeConnectClient, isStripeConnectConfigured } from '@/lib/stripe'
import { mapV2AccountStatus } from '@/lib/stripe-connect'
import { syncConnectedAccount } from '@/lib/stripe-therapy'
import { isValidStripeAccountId } from '@/lib/stripe-connect-paths'

export type ConnectAccess =
  | { kind: 'unauthenticated' }
  | { kind: 'not_psm' }
  | { kind: 'not_connected' }
  | { kind: 'invalid_account' }
  | { kind: 'mismatch' }
  | {
      kind: 'ready'
      accountId: string
      chargesEnabled: boolean
      payoutsEnabled: boolean
    }

/**
 * Resolves which connected account a dashboard page may render.
 *
 * `stripe_account_id` arrives from Stripe's email links, so it is untrusted:
 * a valid session is required, the user must be a PSM, and the requested
 * account must be the one stored on their profile. Without the parameter we
 * fall back to the session's own account.
 */
export async function resolveConnectAccess(
  rawAccountId?: string | null,
  options?: { refresh?: boolean }
): Promise<ConnectAccess> {
  const requested =
    typeof rawAccountId === 'string' && rawAccountId.length > 0 ? rawAccountId : null

  if (requested && !isValidStripeAccountId(requested)) {
    return { kind: 'invalid_account' }
  }

  const session = await getSession()
  if (!session?.userId) {
    return { kind: 'unauthenticated' }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      role: true,
      psm: {
        select: {
          stripeConnectedAccountId: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
        },
      },
    },
  })

  if (!user || user.role !== 'psm' || !user.psm) {
    return { kind: 'not_psm' }
  }

  const accountId = user.psm.stripeConnectedAccountId
  if (!accountId) {
    return { kind: 'not_connected' }
  }

  if (requested && requested !== accountId) {
    return { kind: 'mismatch' }
  }

  let chargesEnabled = user.psm.stripeChargesEnabled
  let payoutsEnabled = user.psm.stripePayoutsEnabled

  // The hosted onboarding return can land before the v2 thin webhook updates
  // the flags, and a missing webhook can leave the panel stale forever. Re-read
  // the account whenever the stored state is incomplete (and on onboarding
  // return), so "Verificación pendiente" never hides an account that already
  // charges and so the onboarding button doesn't silently reload `/cobros`.
  const shouldRefresh =
    options?.refresh === true || !chargesEnabled || !payoutsEnabled

  if (shouldRefresh && isStripeConnectConfigured()) {
    try {
      const account = await getStripeConnectClient().v2.core.accounts.retrieve(accountId, {
        include: ['configuration.merchant', 'requirements'],
      })
      const status = mapV2AccountStatus(account)
      chargesEnabled = status.chargesEnabled
      payoutsEnabled = status.payoutsEnabled
      await syncConnectedAccount(account.id, status)
    } catch (error) {
      console.error('[stripe-connect] status refresh failed', error)
    }
  }

  return {
    kind: 'ready',
    accountId,
    chargesEnabled,
    payoutsEnabled,
  }
}
