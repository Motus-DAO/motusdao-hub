import { randomUUID } from 'crypto'
import type Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordClinicalAccess } from '@/lib/clinical-audit'
import { buildOfficeJitsiUrl } from '@/lib/jitsi'
import { getStripeConnectClient } from '@/lib/stripe'
import { slotDurationMinutes } from '@/lib/psm/availability'
import { THERAPY_CHECKOUT_KIND } from '@/lib/stripe-connect'

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  if (!session.payment_intent) return null
  return typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id
}

export async function refundConnectedPayment(accountId: string, paymentIntentIdValue: string) {
  const stripe = getStripeConnectClient()
  await stripe.refunds.create(
    {
      payment_intent: paymentIntentIdValue,
      refund_application_fee: true,
    },
    { stripeAccount: accountId }
  )
}

async function slotHasActiveSession(psmId: string, slotId: string) {
  const slot = await prisma.providerAvailabilitySlot.findFirst({
    where: { id: slotId, psmId },
  })
  if (!slot) return true
  const conflict = await prisma.session.findFirst({
    where: {
      psmId,
      status: { in: ['requested', 'accepted', 'completed'] },
      scheduledStart: { lt: slot.endsAt },
      scheduledEnd: { gt: slot.startsAt },
    },
  })
  return Boolean(conflict)
}

/**
 * Turns a paid Connect checkout into a therapy session.
 * Safe to call from the webhook and from the return page.
 */
export async function fulfillTherapyCheckout(
  session: Stripe.Checkout.Session,
  request?: NextRequest
): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  if (session.metadata?.kind !== THERAPY_CHECKOUT_KIND) {
    return { ok: false, error: 'Este pago no es una cita.' }
  }
  if (session.payment_status !== 'paid') {
    return { ok: false, error: 'El pago todavía no está confirmado.' }
  }

  const hold = await prisma.therapyCheckoutHold.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  })
  if (!hold) return { ok: false, error: 'No encontramos la reserva de ese pago.' }
  if (hold.sessionId) return { ok: true, sessionId: hold.sessionId }

  const intentId = paymentIntentId(session)
  const accountId = hold.stripeConnectedAccountId

  if (await slotHasActiveSession(hold.psmId, hold.slotId)) {
    if (intentId) {
      try {
        await refundConnectedPayment(accountId, intentId)
      } catch (error) {
        console.error('[therapy-checkout] refund after lost slot failed', error)
      }
    }
    await prisma.therapyCheckoutHold.update({
      where: { id: hold.id },
      data: { status: 'refunded' },
    })
    return { ok: false, error: 'Ese horario se ocupó mientras pagabas. Devolvimos el cobro.' }
  }

  const slot = await prisma.providerAvailabilitySlot.findFirst({
    where: { id: hold.slotId, psmId: hold.psmId },
  })
  if (!slot) return { ok: false, error: 'El horario ya no existe.' }

  const user = await prisma.user.findUnique({
    where: { id: hold.userId },
    include: { userMatches: { where: { status: 'active' } } },
  })
  if (!user) return { ok: false, error: 'No encontramos al paciente.' }

  const otherMatch = user.userMatches.find((match) => match.psmId !== hold.psmId)
  if (otherMatch) {
    if (intentId) {
      try {
        await refundConnectedPayment(accountId, intentId)
      } catch (error) {
        console.error('[therapy-checkout] refund after other match failed', error)
      }
    }
    await prisma.therapyCheckoutHold.update({
      where: { id: hold.id },
      data: { status: 'refunded' },
    })
    return { ok: false, error: 'Ya tienes otro profesional activo. Devolvimos el cobro.' }
  }

  let match = user.userMatches.find((item) => item.psmId === hold.psmId)
  if (!match) {
    match = await prisma.match.create({
      data: {
        userId: user.id,
        psmId: hold.psmId,
        status: 'active',
        source: 'manual',
        score: 1,
      },
    })
  }

  const durationMinutes = slotDurationMinutes(slot)
  const scheduledStart = slot.startsAt
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000)
  const sessionId = randomUUID()

  try {
    const created = await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        psmId: hold.psmId,
        matchId: match.id,
        status: 'accepted',
        mode: 'video_external',
        externalUrl: buildOfficeJitsiUrl(match.id),
        scheduledStart,
        scheduledEnd,
        timezone: slot.timezone,
        durationMinutes,
        acceptedAt: new Date(),
        paidAt: new Date(),
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: intentId,
        stripeConnectedAccountId: accountId,
      },
    })

    await prisma.therapyCheckoutHold.update({
      where: { id: hold.id },
      data: { status: 'paid', sessionId: created.id },
    })

    await recordClinicalAccess({
      request,
      actorUserId: user.id,
      targetUserId: user.id,
      action: 'create',
      resource: 'session',
      resourceId: created.id,
      reason: 'therapy_checkout_paid',
      metadata: { psmId: hold.psmId, slotId: hold.slotId, checkoutSessionId: session.id },
    })

    return { ok: true, sessionId: created.id }
  } catch (error) {
    const existing = await prisma.session.findUnique({
      where: { stripeCheckoutSessionId: session.id },
    })
    if (existing) {
      await prisma.therapyCheckoutHold.update({
        where: { id: hold.id },
        data: { status: 'paid', sessionId: existing.id },
      })
      return { ok: true, sessionId: existing.id }
    }
    console.error('[therapy-checkout] failed to create session', error)
    throw error
  }
}

export async function syncConnectedAccount(account: Stripe.Account) {
  await prisma.pSMProfile.updateMany({
    where: { stripeConnectedAccountId: account.id },
    data: {
      stripeChargesEnabled: Boolean(account.charges_enabled),
      stripePayoutsEnabled: Boolean(account.payouts_enabled),
    },
  })
}
