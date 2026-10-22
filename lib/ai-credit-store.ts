import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  AiCreditExhaustedError,
  DAILY_AI_CREDIT_USD,
  creditDayStart,
  estimateTokens,
  hasRoomForReply,
  inferenceCostUsd,
  outputTokenCap,
  roundCreditUsd,
  splitCreditCharge,
} from '@/lib/ai-credit'

export type CreditSnapshot = {
  allowanceUsd: number
  dailyUsd: number
  purchasedUsd: number
  spentUsd: number
  remainingUsd: number
  timeZone: string
}

function money(value: Prisma.Decimal | number | null | undefined) {
  return Math.round(Number(value ?? 0) * 1e8) / 1e8
}

async function spentSince(tx: Prisma.TransactionClient, userId: string, since: Date) {
  const aggregate = await tx.aiCreditCharge.aggregate({
    where: { userId, createdAt: { gte: since } },
    _sum: { costUsd: true },
  })
  return money(aggregate._sum.costUsd)
}

async function purchasedBalance(tx: Prisma.TransactionClient, userId: string) {
  const wallet = await tx.aiCreditWallet.findUnique({
    where: { userId },
    select: { purchasedUsd: true },
  })
  return money(wallet?.purchasedUsd)
}

async function addPurchased(tx: Prisma.TransactionClient, userId: string, deltaUsd: number) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`
  const next = Math.max(0, roundCreditUsd((await purchasedBalance(tx, userId)) + deltaUsd))
  await tx.aiCreditWallet.upsert({
    where: { userId },
    create: { userId, purchasedUsd: new Prisma.Decimal(next.toFixed(8)) },
    update: { purchasedUsd: new Prisma.Decimal(next.toFixed(8)) },
  })
}

export async function getCreditSnapshot(userId: string, now = new Date()): Promise<CreditSnapshot> {
  const spentUsd = await spentSince(prisma, userId, creditDayStart(now))
  const purchasedUsd = await purchasedBalance(prisma, userId)
  const freeRemaining = Math.max(0, roundCreditUsd(DAILY_AI_CREDIT_USD - spentUsd))
  const remainingUsd = roundCreditUsd(freeRemaining + purchasedUsd)
  return {
    allowanceUsd: roundCreditUsd(DAILY_AI_CREDIT_USD + purchasedUsd),
    dailyUsd: DAILY_AI_CREDIT_USD,
    purchasedUsd,
    spentUsd,
    remainingUsd,
    timeZone: 'America/Mexico_City',
  }
}

export async function reserveAiCredit(input: {
  userId: string
  model: string
  inputText: string
  requestedMaxTokens: number
}) {
  const inputTokens = estimateTokens(input.inputText)
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.userId}))`
    const spentUsd = await spentSince(tx, input.userId, creditDayStart())
    const purchasedUsd = await purchasedBalance(tx, input.userId)
    const freeRoom = Math.max(0, roundCreditUsd(DAILY_AI_CREDIT_USD - spentUsd))
    const remainingUsd = roundCreditUsd(freeRoom + purchasedUsd)
    const maxTokens = outputTokenCap(remainingUsd, inputTokens, input.model, input.requestedMaxTokens)
    if (!hasRoomForReply(maxTokens)) {
      throw new AiCreditExhaustedError(remainingUsd)
    }

    const costUsd = inferenceCostUsd(input.model, inputTokens, maxTokens)
    const split = splitCreditCharge({ spentTodayUsd: spentUsd, purchasedUsd, chargeUsd: costUsd })
    if (!split) throw new AiCreditExhaustedError(remainingUsd)
    if (split.purchasedHoldUsd > 0) await addPurchased(tx, input.userId, -split.purchasedHoldUsd)

    const charge = await tx.aiCreditCharge.create({
      data: {
        userId: input.userId,
        model: input.model,
        promptTokens: inputTokens,
        completionTokens: maxTokens,
        costUsd: new Prisma.Decimal(costUsd.toFixed(8)),
        freeCoverUsd: new Prisma.Decimal(split.freeCoverUsd.toFixed(8)),
        purchasedHoldUsd: new Prisma.Decimal(split.purchasedHoldUsd.toFixed(8)),
        settled: false,
      },
      select: { id: true },
    })

    return { chargeId: charge.id, maxTokens }
  })
}

export async function settleAiCredit(
  chargeId: string,
  usage: { model: string; promptTokens: number; completionTokens: number }
) {
  await prisma.$transaction(async (tx) => {
    const charge = await tx.aiCreditCharge.findUnique({ where: { id: chargeId } })
    if (!charge) return
    const actual = inferenceCostUsd(usage.model, usage.promptTokens, usage.completionTokens)
    const freeCover = money(charge.freeCoverUsd)
    const purchasedHold = money(charge.purchasedHoldUsd)
    const actualPurchased = Math.max(0, roundCreditUsd(actual - freeCover))
    const refund = roundCreditUsd(purchasedHold - actualPurchased)
    if (refund !== 0) await addPurchased(tx, charge.userId, refund)
    await tx.aiCreditCharge.update({
      where: { id: chargeId },
      data: {
        model: usage.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        costUsd: new Prisma.Decimal(actual.toFixed(8)),
        purchasedHoldUsd: new Prisma.Decimal(actualPurchased.toFixed(8)),
        settled: true,
      },
    })
  })
}

export async function finishAiCreditReserve(chargeId: string) {
  await prisma.aiCreditCharge.update({
    where: { id: chargeId },
    data: { settled: true },
  })
}

export async function releaseAiCredit(chargeId: string) {
  await prisma.$transaction(async (tx) => {
    const charge = await tx.aiCreditCharge.findUnique({ where: { id: chargeId } })
    if (!charge) return
    await tx.aiCreditCharge.delete({ where: { id: chargeId } })
    const hold = money(charge.purchasedHoldUsd)
    if (hold > 0) await addPurchased(tx, charge.userId, hold)
  }).catch(() => undefined)
}
