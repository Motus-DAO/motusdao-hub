import { prisma } from '@/lib/prisma'
import { PUBLIC_PSM_WHERE } from '@/lib/psm/public-profile'

export async function findPublicPsmBySlug(slug: string) {
  return prisma.user.findFirst({
    where: {
      ...PUBLIC_PSM_WHERE,
      psm: { is: { slug } },
    },
    include: {
      profile: true,
      psm: true,
      psmMatches: { where: { status: 'active' } },
    },
  })
}

export async function findPsmUserIdBySlug(slug: string): Promise<string | null> {
  const row = await prisma.pSMProfile.findFirst({
    where: {
      slug,
      verificationStatus: 'approved',
      introVideoApproved: true,
      isAcceptingPatients: true,
    },
    select: { userId: true },
  })
  return row?.userId ?? null
}
