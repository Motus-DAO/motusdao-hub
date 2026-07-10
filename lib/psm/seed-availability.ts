import { prisma } from '@/lib/prisma'

const DEFAULT_TIMEZONE = 'America/Mexico_City'
const SLOT_DURATION_MINUTES = 50
const DAYS_AHEAD = 7
const SLOT_HOURS = [9, 10, 14, 16, 18]

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
  let created = 0
  let skipped = 0

  for (let day = 0; day <= daysAhead; day += 1) {
    for (const hour of SLOT_HOURS) {
      const startsAt = slotStart(now, day, hour)
      if (startsAt <= now) {
        skipped += 1
        continue
      }

      const existing = await prisma.providerAvailabilitySlot.findFirst({
        where: { psmId, startsAt },
      })
      if (existing) {
        skipped += 1
        continue
      }

      const endsAt = new Date(startsAt.getTime() + SLOT_DURATION_MINUTES * 60 * 1000)
      await prisma.providerAvailabilitySlot.create({
        data: {
          psmId,
          startsAt,
          endsAt,
          timezone: DEFAULT_TIMEZONE,
          notes,
        },
      })
      created += 1
    }
  }

  return { created, skipped }
}
