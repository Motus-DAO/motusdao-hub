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
import { CONNECT_PATHS } from '@/lib/stripe-connect-paths'

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
      accountId: fresh?.stripeConnectedAccountId ?? null,
      chargesEnabled: live?.chargesEnabled ?? Boolean(fresh?.stripeChargesEnabled),
      payoutsEnabled: live?.payoutsEnabled ?? Boolean(fresh?.stripePayoutsEnabled),
      onboardingComplete: live?.onboardingComplete ?? false,
      requirementsDue: live?.requirementsDue ?? false,
      feeBps: connectFeeBps(),
      dashboardPath: CONNECT_PATHS.home,
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

    // This account has `dashboard: 'none'` and Stripe collects requirements,
    // so Stripe does not allow `account_update` links. Once charging is
    // enabled, requirement and bank-account changes happen in the embedded
    // Account management component instead.
    if (status.chargesEnabled) {
      const destination =
        status.requirementsDue || !status.payoutsEnabled
          ? CONNECT_PATHS.account
          : CONNECT_PATHS.home
      return NextResponse.json({ url: destination, accountId, embedded: true })
    }

    const origin = browserOrigin(request)
    const refreshUrl = `${origin}${CONNECT_PATHS.home}?stripe_connect=refresh`
    const returnUrl = `${origin}${CONNECT_PATHS.home}?stripe_connect=return`
    const configurations: Array<'merchant'> = ['merchant']

    // Incomplete accounts keep the hosted onboarding flow.
    const link = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations,
          refresh_url: refreshUrl,
          return_url: returnUrl,
        },
      },
    })

    return NextResponse.json({ url: link.url, accountId, embedded: false })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('[stripe-connect] onboarding failed', error)

    const stripeError = error as {
      message?: unknown
      code?: unknown
      type?: unknown
      requestId?: unknown
    }
    const rawMessage =
      typeof stripeError.message === 'string' ? stripeError.message : ''
    const lower = rawMessage.toLowerCase()
    const diagnostics = {
      detail: rawMessage || undefined,
      stripeCode:
        typeof stripeError.code === 'string' ? stripeError.code : undefined,
      stripeType:
        typeof stripeError.type === 'string' ? stripeError.type : undefined,
      requestId:
        typeof stripeError.requestId === 'string'
          ? stripeError.requestId
          : undefined,
    }

    if (
      lower.includes('site links') ||
      lower.includes('site_links') ||
      lower.includes('site-links') ||
      lower.includes('supplied urls')
    ) {
      return NextResponse.json(
        {
          error:
            'Stripe todavía no permite enlaces en vivo. Configura los Site links en Dashboard → Settings → Connect → Site links.',
          ...diagnostics,
        },
        { status: 502 }
      )
    }

    if (
      stripeError.type === 'StripePermissionError' ||
      stripeError.code === 'forbidden' ||
      lower.includes('permission')
    ) {
      return NextResponse.json(
        {
          error:
            'La llave de Stripe Connect no tiene permiso para crear enlaces de onboarding. Usa la llave live de MotusDAO-Connect o agrega Account Links: write a la llave restringida.',
          ...diagnostics,
        },
        { status: 502 }
      )
    }

    return NextResponse.json(
      {
        error: 'No pudimos abrir la verificación de Stripe. Intenta de nuevo.',
        ...diagnostics,
      },
      { status: 500 }
    )
  }
}
