import { SessionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const BOOKED_STATUSES: SessionStatus[] = ['requested', 'accepted', 'completed']

export async function getAvailableSlotsForPsm(psmId: string, daysAhead = 14) {
  const now = new Date()
  const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  const [slots, bookedSessions] = await Promise.all([
    prisma.providerAvailabilitySlot.findMany({
      where: {
        psmId,
        isAvailable: true,
        startsAt: { gte: now, lte: horizon },
      },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.session.findMany({
      where: {
        psmId,
        status: { in: BOOKED_STATUSES },
        scheduledStart: { not: null, lt: horizon },
        scheduledEnd: { not: null, gt: now },
      },
      select: { scheduledStart: true, scheduledEnd: true },
    }),
  ])

  return slots.filter((slot) => {
    return !bookedSessions.some((session) => {
      if (!session.scheduledStart || !session.scheduledEnd) return false
      return (
        session.scheduledStart < slot.endsAt && session.scheduledEnd > slot.startsAt
      )
    })
  })
}

export async function isSlotAvailable(slotId: string, psmId: string): Promise<boolean> {
  const slot = await prisma.providerAvailabilitySlot.findFirst({
    where: { id: slotId, psmId, isAvailable: true, startsAt: { gt: new Date() } },
  })
  if (!slot) return false

  const conflict = await prisma.session.findFirst({
    where: {
      psmId,
      status: { in: BOOKED_STATUSES },
      scheduledStart: { lt: slot.endsAt },
      scheduledEnd: { gt: slot.startsAt },
    },
  })
  return !conflict
}

export function slotDurationMinutes(slot: { startsAt: Date; endsAt: Date }): number {
  return Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60000)
}
