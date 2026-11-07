import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { assertAuthenticatedUser } from '@/lib/auth/guards'
import { getStripeConnectClient, isStripeConnectConfigured } from '@/lib/stripe'
import {
  PLATFORM_CONNECT_COUNTRY,
  browserOrigin,
  connectFeeBps,
  mapV2AccountStatus,
  stripeCountryCode,
  type ConnectAccountStatus,
} from '@/lib/stripe-connect'
import { syncConnectedAccount } from '@/lib/stripe-therapy'

const ACCOUNT_INCLUDE = ['configuration.merchant', 'requirements'] as const

async function loadPsm(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, psm: true },
  })
}

/** Accounts v2 hide configuration/requirements unless they are requested. */
async function loadAccount(stripe: Stripe, accountId: string) {
  return stripe.v2.core.accounts.retrieve(accountId, {
    include: [...ACCOUNT_INCLUDE],
  })
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSession(request)
    const user = await loadPsm(assertAuthenticatedUser(actor))
    if (!user?.psm) {
      return NextResponse.json({ error: 'Solo un profesional puede conectar Stripe.' }, { status: 403 })
    }

    let live: ConnectAccountStatus | null = null
    if (user.psm.stripeConnectedAccountId && isStripeConnectConfigured()) {
      try {
        const account = await loadAccount(getStripeConnectClient(), user.psm.stripeConnectedAccountId)
        live = mapV2AccountStatus(account)
        await syncConnectedAccount(account.id, live)
      } catch (error) {
        console.error('[stripe-connect] status refresh failed', error)
      }
    }

    const fresh = await prisma.pSMProfile.findUnique({ where: { userId: user.id } })
    return NextResponse.json({
      connected: Boolean(fresh?.stripeConnectedAccountId),
      chargesEnabled: live?.chargesEnabled ?? Boolean(fresh?.stripeChargesEnabled),
      payoutsEnabled: live?.payoutsEnabled ?? Boolean(fresh?.stripePayoutsEnabled),
      onboardingComplete: live?.onboardingComplete ?? false,
      requirementsDue: live?.requirementsDue ?? false,
      feeBps: connectFeeBps(),
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    console.error('[stripe-connect] status failed', error)
    return NextResponse.json({ error: 'No pudimos leer la cuenta de Stripe.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConnectConfigured()) {
      return NextResponse.json({ error: 'Stripe Connect no está configurado.' }, { status: 503 })
    }

    const actor = await requireSession(request)
    const user = await loadPsm(assertAuthenticatedUser(actor))
    if (!user?.psm) {
      return NextResponse.json({ error: 'Solo un profesional puede conectar Stripe.' }, { status: 403 })
    }

    const stripe = getStripeConnectClient()
    let accountId = user.psm.stripeConnectedAccountId

    if (!accountId) {
      const country = stripeCountryCode(user.profile?.pais)
      if (country !== PLATFORM_CONNECT_COUNTRY) {
        return NextResponse.json(
          { error: 'Por ahora solo los profesionales en México pueden cobrar con tarjeta.' },
          { status: 400 }
        )
      }

      const displayName =
        `${user.profile?.nombre || ''} ${user.profile?.apellido || ''}`.trim() || user.email

      // Accounts v2. The platform profile is configured with Stripe collecting
      // fees and bearing losses, and no hosted dashboard for the account.
      const account = await stripe.v2.core.accounts.create({
        display_name: displayName,
        contact_email: user.email,
        identity: { country: PLATFORM_CONNECT_COUNTRY.toLowerCase() },
        dashboard: 'none',
        defaults: {
          responsibilities: {
            fees_collector: 'stripe',
            losses_collector: 'stripe',
          },
          locales: ['es-419'],
        },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true },
            },
          },
        },
        metadata: { motusUserId: user.id },
      })

      accountId = account.id
      await prisma.pSMProfile.update({
        where: { userId: user.id },
        data: { stripeConnectedAccountId: accountId },
      })
    }

    const account = await loadAccount(stripe, accountId)
    const status = mapV2AccountStatus(account)
    const origin = browserOrigin(request)
    const refreshUrl = `${origin}/perfil?stripe_connect=refresh`
    const returnUrl = `${origin}/perfil?stripe_connect=return`
    const configurations: Array<'merchant'> = ['merchant']

    // An account that already charges needs an update link to fix requirements;
    // an incomplete one resumes the onboarding flow.
    const link = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: status.chargesEnabled
        ? {
            type: 'account_update',
            account_update: {
              configurations,
              refresh_url: refreshUrl,
              return_url: returnUrl,
            },
          }
        : {
            type: 'account_onboarding',
            account_onboarding: {
              configurations,
              refresh_url: refreshUrl,
              return_url: returnUrl,
            },
          },
    })

    return NextResponse.json({ url: link.url })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    const message = error instanceof Error ? error.message : 'No pudimos abrir Stripe.'
    console.error('[stripe-connect] onboarding failed', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
