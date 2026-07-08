import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PUBLIC_PSM_WHERE } from '../lib/psm/public-profile'

const DEFAULT_TIMEZONE = 'America/Mexico_City'
const SLOT_DURATION_MINUTES = 50
const DAYS_AHEAD = 7
/** Local hours (Mexico City) for demo slots each day */
const SLOT_HOURS = [10, 14, 16]

async function main() {
  const prisma = new PrismaClient()
  const dryRun = process.argv.includes('--dry-run')

  try {
    const psms = await prisma.user.findMany({
      where: PUBLIC_PSM_WHERE,
      select: {
        id: true,
        email: true,
        psm: { select: { slug: true } },
      },
    })

    if (psms.length === 0) {
      console.log('No published accepting PSMs found. Nothing to seed.')
      return
    }

    const now = new Date()
    const results: Array<{ slug: string; created: number; skipped: boolean }> = []

    for (const psm of psms) {
      const slug = psm.psm?.slug ?? psm.id
      const existingFuture = await prisma.providerAvailabilitySlot.count({
        where: {
          psmId: psm.id,
          isAvailable: true,
          startsAt: { gt: now },
        },
      })

      if (existingFuture > 0) {
        results.push({ slug, created: 0, skipped: true })
        continue
      }

      const slotsToCreate: Array<{
        psmId: string
        startsAt: Date
        endsAt: Date
        timezone: string
        notes: string
      }> = []

      for (let day = 1; day <= DAYS_AHEAD; day += 1) {
        for (const hour of SLOT_HOURS) {
          const startsAt = nextSlotStart(now, day, hour)
          const endsAt = new Date(startsAt.getTime() + SLOT_DURATION_MINUTES * 60 * 1000)
          slotsToCreate.push({
            psmId: psm.id,
            startsAt,
            endsAt,
            timezone: DEFAULT_TIMEZONE,
            notes: 'seed-psm-availability',
          })
        }
      }

      if (!dryRun) {
        await prisma.providerAvailabilitySlot.createMany({ data: slotsToCreate })
      }

      results.push({ slug, created: slotsToCreate.length, skipped: false })
    }

    console.log(
      JSON.stringify(
        {
          dryRun,
          psmCount: psms.length,
          results,
          totalCreated: results.reduce((sum, row) => sum + row.created, 0),
        },
        null,
        2
      )
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Approximate Mexico City local hour using a fixed UTC-6 offset (no DST handling).
 * Good enough for demo seed slots; PSM UI + future calendar sync own timezone truth.
 */
function nextSlotStart(from: Date, daysAhead: number, hourLocal: number): Date {
  const base = new Date(from)
  base.setUTCHours(0, 0, 0, 0)
  base.setUTCDate(base.getUTCDate() + daysAhead)
  const utcHour = hourLocal + 6
  base.setUTCHours(utcHour, 0, 0, 0)
  return base
}

void main()
