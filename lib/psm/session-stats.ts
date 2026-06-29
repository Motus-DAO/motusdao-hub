import { prisma } from '@/lib/prisma'

/**
 * Update denormalized PSM stats after a session completes.
 */
export async function incrementPsmSessionStats(psmId: string, userId: string) {
  const priorCompleted = await prisma.session.count({
    where: {
      psmId,
      userId,
      status: 'completed',
    },
  })

  await prisma.pSMProfile.update({
    where: { userId: psmId },
    data: {
      completedSessionsCount: { increment: 1 },
      ...(priorCompleted === 0 ? { patientCount: { increment: 1 } } : {}),
    },
  })
}
