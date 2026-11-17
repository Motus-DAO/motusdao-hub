import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'
import { createFoundingStripePromotionCode } from '@/lib/founding/stripe-promo'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  const { id } = await context.params
  const entry = await prisma.foundingWaitlistEntry.findUnique({ where: { id } })
  if (!entry) {
    return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 })
  }

  if (entry.stripePromotionCode && entry.stripePromotionCodeId) {
    return NextResponse.json({
      code: entry.stripePromotionCode,
      promotionCodeId: entry.stripePromotionCodeId,
      existing: true,
    })
  }

  try {
    const { code, promotionCodeId } = await createFoundingStripePromotionCode(entry)
    const updated = await prisma.foundingWaitlistEntry.update({
      where: { id },
      data: {
        stripePromotionCode: code,
        stripePromotionCodeId: promotionCodeId,
      },
    })
    return NextResponse.json({
      code: updated.stripePromotionCode,
      promotionCodeId: updated.stripePromotionCodeId,
    })
  } catch (error) {
    console.error('founding stripe-code', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo crear el código.' },
      { status: 500 }
    )
  }
}