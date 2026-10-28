import { prisma } from '@/lib/prisma'

export async function hasClinicalSummaryShareConsent(userId: string): Promise<boolean> {
  const record = await prisma.consentRecord.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { acceptedAt: 'desc' },
    select: { consentToShareWithPSM: true },
  })
  return record?.consentToShareWithPSM === true
}

export async function getActiveMatchForPatient(userId: string) {
  return prisma.match.findFirst({
    where: { userId, status: 'active' },
    select: { id: true, psmId: true, userId: true },
  })
}
