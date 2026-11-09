import { prisma } from '@/lib/prisma'
import { mxnPerUsd } from '@/lib/motty/payments'
import { coursePriceAmount, normalizeCourseCurrency } from '@/lib/academy/course-pricing'

const TREASURY =
  process.env.NEXT_PUBLIC_DAO_TREASURY_ADDRESS ||
  '0xf229F3Dcea3D7cd3cA5ca41C4C50135D7b37F2b9'

const MEMBERSHIP_PRICE_MXN = Number(process.env.MOTUS_MEMBERSHIP_PRICE_MXN || '299')

export async function createProductPayment(input: {
  userId: string
  product: 'membership' | 'course'
  courseSlug?: string
  method: 'stripe' | 'crypto'
}) {
  let name = ''
  let amountMxn = 0
  let stripeUrl = ''
  let interval = ''

  if (input.product === 'membership') {
    name = 'Membresía MotusDAO'
    amountMxn = MEMBERSHIP_PRICE_MXN
    stripeUrl = process.env.MOTUS_MEMBERSHIP_STRIPE_URL || '/membresia'
  } else {
    if (!input.courseSlug) {
      return { ok: false as const, error: 'course_required' }
    }
    const course = await prisma.course.findFirst({
      where: {
        isPublished: true,
        OR: [{ slug: input.courseSlug }, { id: input.courseSlug }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        priceAmount: true,
        priceCurrency: true,
        billingInterval: true,
      },
    })
    if (!course) return { ok: false as const, error: 'course_not_found' }

    const amount = coursePriceAmount(course)
    if (!(amount > 0)) {
      return { ok: false as const, error: 'course_is_free' }
    }
    const currency = normalizeCourseCurrency(course.priceCurrency)
    amountMxn = currency === 'USD' ? amount * mxnPerUsd() : amount
    name = course.title
    stripeUrl = `/academia/${course.id}`
    interval = course.billingInterval === 'monthly' ? 'mensual' : ''
  }

  if (input.method === 'stripe') {
    return {
      ok: true as const,
      kind: 'stripe' as const,
      product: input.product,
      name,
      amountMxn: amountMxn.toFixed(2),
      interval,
      url: stripeUrl,
      note: 'Abre el enlace de Stripe; el cobro se completa fuera del chat y vuelve al Hub.',
    }
  }

  return {
    ok: true as const,
    kind: 'transfer' as const,
    product: input.product,
    name,
    amountMxn: amountMxn.toFixed(2),
    interval,
    toName: `Tesorería MotusDAO · ${name}`,
    toAddress: TREASURY,
    amount: amountMxn.toFixed(2),
    token: 'wMXN' as const,
    link: '',
    note: 'Pago directo a la tesorería en wMXN; el usuario firma en la tarjeta.',
  }
}
