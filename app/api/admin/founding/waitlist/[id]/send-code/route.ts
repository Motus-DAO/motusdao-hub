import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'
import { sendFoundingPromoCodeEmail } from '@/lib/founding/mail'
import { supportMailNotReadyReason, supportMailPlumbingReady } from '@/lib/support-mail'

const bodySchema = z.object({
  skipEmail: z.boolean().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  const { id } = await context.params
  const entry = await prisma.foundingWaitlistEntry.findUnique({ where: { id } })
  if (!entry) {
    return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 })
  }

  if (!entry.stripePromotionCode) {
    return NextResponse.json(
      { error: 'Genera el código Stripe antes de enviar.' },
      { status: 400 }
    )
  }

  const body = bodySchema.safeParse(await request.json().catch(() => ({})))
  const skipEmail = body.success && body.data.skipEmail === true

  if (!skipEmail) {
    if (!supportMailPlumbingReady()) {
      return NextResponse.json(
        {
          error: `Correo no configurado. ${supportMailNotReadyReason()} O usa «Marcar enviado» (skipEmail).`,
        },
        { status: 503 }
      )
    }
    try {
      await sendFoundingPromoCodeEmail(entry, entry.stripePromotionCode)
    } catch (error) {
      console.error(
        JSON.stringify({
          scope: 'motus.hub.founding_mail_error',
          ticketId: entry.id,
          message: error instanceof Error ? error.message : 'unknown',
        })
      )
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'No se pudo enviar el correo.' },
        { status: 500 }
      )
    }
  }

  const updated = await prisma.foundingWaitlistEntry.update({
    where: { id },
    data: {
      status: 'code_sent',
      codeSentAt: new Date(),
    },
  })

  return NextResponse.json({
    success: true,
    status: updated.status,
    codeSentAt: updated.codeSentAt?.toISOString() ?? null,
    emailed: !skipEmail,
  })
}