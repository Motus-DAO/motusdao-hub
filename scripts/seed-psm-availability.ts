import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PUBLIC_PSM_WHERE } from '../lib/psm/public-profile'
import { seedAvailabilityForPsm } from '../lib/psm/seed-availability'

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

      if (dryRun) {
        results.push({ slug, created: 0, skipped: false })
        continue
      }

      const { created } = await seedAvailabilityForPsm(psm.id, {
        notes: 'seed-psm-availability',
      })

      results.push({ slug, created, skipped: false })
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

void main()
