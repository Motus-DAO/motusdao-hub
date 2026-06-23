/**
 * Post-migration smoke checks against the live Supabase DB.
 * Validates schema + read paths for onboarding, profile, bitácora, matching, PSM admin, sessions.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Check = { name: string; ok: boolean; detail?: string }

async function main() {
  const checks: Check[] = []

  async function check(name: string, fn: () => Promise<void>) {
    try {
      await fn()
      checks.push({ name, ok: true })
    } catch (error) {
      checks.push({
        name,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      })
    }
  }

  await check('db connectivity', async () => {
    await prisma.$queryRaw`SELECT 1`
  })

  await check('onboarding: users readable', async () => {
    const users = await prisma.user.findMany({
      take: 5,
      select: { id: true, onboardingStatus: true, registrationCompleted: true, role: true },
    })
    if (!Array.isArray(users)) throw new Error('Expected user array')
  })

  await check('profile: profiles + patient/psm profiles', async () => {
    await prisma.profile.findMany({ take: 3, select: { id: true, userId: true } })
    await prisma.patientProfile.findMany({ take: 3, select: { id: true, userId: true } })
    await prisma.pSMProfile.findMany({
      take: 3,
      select: { id: true, userId: true, verifiedAt: true, verifiedByUserId: true, suspendedAt: true },
    })
  })

  await check('bitácora: journal entries + clinical audit table', async () => {
    await prisma.journalEntry.findMany({ take: 3, select: { id: true, userId: true } })
    await prisma.clinicalAccessLog.findMany({ take: 3, select: { id: true, resource: true } })
  })

  await check('matching: matches with new scoring columns', async () => {
    await prisma.match.findMany({
      take: 5,
      select: { id: true, source: true, score: true, scoreBreakdown: true },
    })
  })

  await check('PSM admin: verification fields + availability', async () => {
    await prisma.pSMProfile.findMany({
      take: 5,
      select: { id: true, verifiedAt: true, rejectedAt: true, suspendedAt: true },
    })
    await prisma.providerAvailabilitySlot.findMany({ take: 3, select: { id: true, psmId: true } })
  })

  await check('sessions: scheduling columns', async () => {
    await prisma.session.findMany({
      take: 5,
      select: {
        id: true,
        scheduledStart: true,
        scheduledEnd: true,
        timezone: true,
        durationMinutes: true,
      },
    })
  })

  await check('marketplace: orders + payments tables', async () => {
    await prisma.order.findMany({ take: 3, select: { id: true, status: true } })
    await prisma.payment.findMany({ take: 3, select: { id: true, status: true, provider: true } })
  })

  const failed = checks.filter((c) => !c.ok)
  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`)
  }

  await prisma.$disconnect()

  if (failed.length) {
    process.exitCode = 1
    console.error(`\n${failed.length} smoke check(s) failed`)
  } else {
    console.log(`\nAll ${checks.length} smoke checks passed`)
  }
}

main()
