import { prisma } from '@/lib/prisma'

export async function hasPrivacyNoticeConsent(userId: string): Promise<boolean> {
  const record = await prisma.consentRecord.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { acceptedAt: 'desc' },
    select: { consentToPrivacy: true },
  })
  return record?.consentToPrivacy === true
}

export async function hasTrainingCopyConsent(userId: string): Promise<boolean> {
  const record = await prisma.consentRecord.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { acceptedAt: 'desc' },
    select: { consentToTrainingCopy: true },
  })
  return record?.consentToTrainingCopy === true
}

export async function latestConsentFlags(userId: string) {
  return prisma.consentRecord.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { acceptedAt: 'desc' },
  })
}
