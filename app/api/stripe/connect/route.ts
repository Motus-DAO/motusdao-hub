import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { assertAuthenticatedUser } from '@/lib/auth/guards'
import { getStripeConnectClient, isStripeConnectConfigured } from '@/lib/stripe'
import { browserOrigin, connectFeeBps, stripeCountryCode } from '@/lib/stripe-connect'
import { syncConnectedAccount } from '@/lib/stripe-therapy'

async function loadPsm(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, psm: true },
  })
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSession(request)
    const user = await loadPsm(assertAuthenticatedUser(actor))
    if (!user?.psm) {
      return NextResponse.json({ error: 'Solo un profesional puede conectar Stripe.' }, { status: 403 })
    }

    if (user.psm.stripeConnectedAccountId && isStripeConnectConfigured()) {
      const account = await getStripeConnectClient().accounts.retrieve(user.psm.stripeConnectedAccountId)
      await syncConnectedAccount(account)
    }

    const fresh = await prisma.pSMProfile.findUnique({ where: { userId: user.id } })
    return NextResponse.json({
      connected: Boolean(fresh?.stripeConnectedAccountId),
      chargesEnabled: Boolean(fresh?.stripeChargesEnabled),
      payoutsEnabled: Boolean(fresh?.stripePayoutsEnabled),
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
      return NextResponse.json({ error: 'Stripe no está configurado.' }, { status: 503 })
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
      if (!country) {
        return NextResponse.json(
          { error: 'Tu perfil necesita un país que Stripe pueda usar (México, Colombia, Argentina, Chile, Perú, España u otro de la lista).' },
          { status: 400 }
        )
      }

      const account = await stripe.accounts.create({
        type: 'express',
        country,
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { motusUserId: user.id },
      })
      accountId = account.id
      await prisma.pSMProfile.update({
        where: { userId: user.id },
        data: { stripeConnectedAccountId: accountId },
      })
    }

    const origin = browserOrigin(request)
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/perfil?stripe_connect=refresh`,
      return_url: `${origin}/perfil?stripe_connect=return`,
      type: 'account_onboarding',
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
