import { prisma } from '@/lib/prisma'

const DEFAULT_TIMEZONE = 'America/Mexico_City'
const SLOT_DURATION_MINUTES = 50
const DAYS_AHEAD = 7
const SLOT_HOURS = Array.from({ length: 24 }, (_, hour) => hour)

/**
 * Approximate Mexico City local hour using a fixed UTC-6 offset (no DST handling).
 */
function slotStart(from: Date, daysAhead: number, hourLocal: number): Date {
  const base = new Date(from)
  base.setUTCHours(0, 0, 0, 0)
  base.setUTCDate(base.getUTCDate() + daysAhead)
  base.setUTCHours(hourLocal + 6, 0, 0, 0)
  return base
}

export async function seedAvailabilityForPsm(
  psmId: string,
  options?: { notes?: string; daysAhead?: number }
): Promise<{ created: number; skipped: number }> {
  const now = new Date()
  const daysAhead = options?.daysAhead ?? DAYS_AHEAD
  const notes = options?.notes ?? 'admin-seed-availability'

  // 24 h x N days: build the grid in memory, then two queries instead of one
  // per slot (a 24 h seed is 192 slots, too many sequential round-trips).
  const wanted: Date[] = []
  for (let day = 0; day <= daysAhead; day += 1) {
    for (const hour of SLOT_HOURS) {
      const startsAt = slotStart(now, day, hour)
      if (startsAt > now) wanted.push(startsAt)
    }
  }

  const existing = await prisma.providerAvailabilitySlot.findMany({
    where: { psmId, startsAt: { in: wanted } },
    select: { startsAt: true },
  })
  const taken = new Set(existing.map((slot) => slot.startsAt.getTime()))
  const toCreate = wanted.filter((startsAt) => !taken.has(startsAt.getTime()))

  if (toCreate.length > 0) {
    await prisma.providerAvailabilitySlot.createMany({
      data: toCreate.map((startsAt) => ({
        psmId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + SLOT_DURATION_MINUTES * 60 * 1000),
        timezone: DEFAULT_TIMEZONE,
        notes,
      })),
    })
  }

  return { created: toCreate.length, skipped: wanted.length - toCreate.length }
}
