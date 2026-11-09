import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import { PLATFORM_SESSION_PRICE_USD } from '@/lib/constants'
import { findPublicPsmBySlug } from '@/lib/psm/lookup'
import { isSlotAvailable, slotDurationMinutes } from '@/lib/psm/availability'
import { getStripeConnectClient, isStripeConnectConfigured, toStripeUnitAmount } from '@/lib/stripe'
import {
  CHECKOUT_HOLD_MS,
  THERAPY_CHECKOUT_KIND,
  applicationFeeCents,
  browserOrigin,
} from '@/lib/stripe-connect'

const checkoutSchema = z.object({
  userId: z.string().min(1),
  slotId: z.string().min(1),
})

type RouteParams = { params: Promise<{ slug: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isStripeConnectConfigured()) {
      return NextResponse.json({ error: 'Stripe no está configurado.' }, { status: 503 })
    }

    const { slug } = await params
    const body = checkoutSchema.parse(await request.json())
    await requireSelfOrAdmin(request, body.userId)

    const psmUser = await findPublicPsmBySlug(slug)
    if (!psmUser?.psm) {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }
    if (!psmUser.psm.stripeChargesEnabled || !psmUser.psm.stripeConnectedAccountId) {
      return NextResponse.json(
        { error: 'Este profesional todavía no cobra con tarjeta.' },
        { status: 409 }
      )
    }

    const accountId = psmUser.psm.stripeConnectedAccountId
    const slot = await prisma.providerAvailabilitySlot.findFirst({
      where: {
        id: body.slotId,
        psmId: psmUser.id,
        isAvailable: true,
        startsAt: { gt: new Date() },
      },
    })
    if (!slot) {
      return NextResponse.json({ error: 'Horario no disponible' }, { status: 404 })
    }
    if (!(await isSlotAvailable(slot.id, psmUser.id))) {
      return NextResponse.json({ error: 'Ese horario ya fue reservado' }, { status: 409 })
    }

    const user = await prisma.user.findUnique({
      where: { id: body.userId },
      include: { userMatches: { where: { status: 'active' } }, profile: true },
    })
    if (!user || user.role !== 'usuario') {
      return NextResponse.json({ error: 'Solo los usuarios pueden agendar sesiones' }, { status: 400 })
    }
    const now = new Date()
    const currentHold = await prisma.therapyCheckoutHold.findUnique({ where: { slotId: slot.id } })
    if (
      currentHold &&
      currentHold.status === 'pending' &&
      currentHold.expiresAt > now &&
      currentHold.userId !== user.id
    ) {
      return NextResponse.json(
        { error: 'Alguien más está pagando este horario. Elige otro o intenta en unos minutos.' },
        { status: 409 }
      )
    }
    if (currentHold?.status === 'pending' && currentHold.expiresAt > now && currentHold.userId === user.id) {
      return NextResponse.json({ url: currentHold.checkoutUrl })
    }
    if (currentHold?.sessionId) {
      const booked = await prisma.session.findUnique({ where: { id: currentHold.sessionId } })
      if (booked && booked.status !== 'cancelled') {
        return NextResponse.json({ error: 'Ese horario ya fue reservado' }, { status: 409 })
      }
    }

    const amountCents = toStripeUnitAmount(PLATFORM_SESSION_PRICE_USD, 'usd')
    const feeCents = applicationFeeCents(amountCents)
    const origin = browserOrigin(request)
    const professionalName = `${psmUser.profile?.nombre || ''} ${psmUser.profile?.apellido || ''}`.trim() || 'tu profesional'
    const stripe = getStripeConnectClient()
    const checkout = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: user.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: amountCents,
              product_data: {
                name: `Sesión de terapia con ${professionalName}`,
                description: `${slotDurationMinutes(slot)} minutos por videollamada`,
              },
            },
          },
        ],
        payment_intent_data: {
          application_fee_amount: feeCents,
        },
        metadata: {
          kind: THERAPY_CHECKOUT_KIND,
          userId: user.id,
          psmId: psmUser.id,
          slotId: slot.id,
        },
        success_url: `${origin}/perfil?booked=1&therapy_checkout={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/psicoterapia/${slug}?pago=cancelado`,
        expires_at: Math.floor((now.getTime() + CHECKOUT_HOLD_MS) / 1000),
      },
      { stripeAccount: accountId }
    )

    if (!checkout.url) {
      return NextResponse.json({ error: 'Stripe no devolvió el enlace de pago.' }, { status: 502 })
    }

    const holdData = {
      userId: user.id,
      psmId: psmUser.id,
      slotId: slot.id,
      stripeCheckoutSessionId: checkout.id,
      stripeConnectedAccountId: accountId,
      checkoutUrl: checkout.url,
      amountCents,
      feeCents,
      status: 'pending',
      expiresAt: new Date(now.getTime() + CHECKOUT_HOLD_MS),
      sessionId: null,
    }

    if (currentHold) {
      await prisma.therapyCheckoutHold.update({
        where: { id: currentHold.id },
        data: holdData,
      })
    } else {
      try {
        await prisma.therapyCheckoutHold.create({ data: holdData })
      } catch (error) {
        await stripe.checkout.sessions.expire(checkout.id, {}, { stripeAccount: accountId }).catch(() => undefined)
        const latest = await prisma.therapyCheckoutHold.findUnique({ where: { slotId: slot.id } })
        if (latest?.status === 'pending' && latest.expiresAt > new Date() && latest.userId === user.id) {
          return NextResponse.json({ url: latest.checkoutUrl })
        }
        console.error('[therapy-checkout] hold conflict', error)
        return NextResponse.json(
          { error: 'Alguien más está pagando este horario. Elige otro o intenta en unos minutos.' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json({ url: checkout.url })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos de reserva inválidos' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'No pudimos abrir el pago.'
    console.error('[therapy-checkout] create failed', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
