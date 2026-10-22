import type Stripe from 'stripe'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { isAiCreditPack, roundCreditUsd } from '@/lib/ai-credit'

export async function fulfillAiCreditPurchase(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== 'ai_credit') {
    throw new Error('Stripe session is not an AI credit purchase')
  }
  if (session.payment_status !== 'paid') {
    throw new Error('Payment not completed')
  }

  const userId = session.metadata.userId
  const amountUsd = Number(session.metadata.amountUsd)
  const paidUsd = (session.amount_total ?? 0) / 100
  if (!userId || !isAiCreditPack(amountUsd) || (session.currency || '').toLowerCase() !== 'usd') {
    throw new Error('Invalid AI credit checkout')
  }
  if (Math.abs(paidUsd - amountUsd) > 0.001) {
    throw new Error('Paid amount does not match the pack')
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`
    const existing = await tx.aiCreditPurchase.findUnique({
      where: { stripeCheckoutSessionId: session.id },
      select: { amountUsd: true },
    })
    if (existing) {
      return { alreadyFulfilled: true, amountUsd: roundCreditUsd(Number(existing.amountUsd)) }
    }

    await tx.aiCreditPurchase.create({
      data: {
        userId,
        amountUsd: new Prisma.Decimal(amountUsd.toFixed(2)),
        stripeCheckoutSessionId: session.id,
      },
    })

    const wallet = await tx.aiCreditWallet.findUnique({
      where: { userId },
      select: { purchasedUsd: true },
    })
    const next = roundCreditUsd(Number(wallet?.purchasedUsd ?? 0) + amountUsd)
    await tx.aiCreditWallet.upsert({
      where: { userId },
      create: { userId, purchasedUsd: new Prisma.Decimal(next.toFixed(8)) },
      update: { purchasedUsd: new Prisma.Decimal(next.toFixed(8)) },
    })

    return { alreadyFulfilled: false, amountUsd }
  })
}
