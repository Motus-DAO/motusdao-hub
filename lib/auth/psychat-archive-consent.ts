import { prisma } from '@/lib/prisma'

export async function hasStoredPsychatArchiveConsent(userId: string): Promise<boolean> {
  const record = await prisma.consentRecord.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { acceptedAt: 'desc' },
    select: { consentToPsychatArchive: true },
  })
  return record?.consentToPsychatArchive === true
}
