import type { Prisma, VerificationStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type PsmVerificationAction = 'approve' | 'reject' | 'suspend' | 'request_resubmission'

export function getPsmVerificationTransition(input: {
  action: PsmVerificationAction
  adminUserId?: string | null
  notes?: string | null
}): {
  user: Prisma.UserUpdateInput
  psm: Prisma.PSMProfileUpdateInput
} {
  const now = new Date()
  const notes = input.notes?.trim() || null

  switch (input.action) {
    case 'approve':
      return {
        user: { onboardingStatus: 'active' },
        psm: {
          verificationStatus: 'approved',
          isAcceptingPatients: true,
          adminReviewNotes: notes,
          verifiedAt: now,
          verifiedByUserId: input.adminUserId ?? null,
          rejectedAt: null,
          suspendedAt: null,
        },
      }
    case 'reject':
      return {
        user: { onboardingStatus: 'pending_verification' },
        psm: {
          verificationStatus: 'rejected',
          isAcceptingPatients: false,
          adminReviewNotes: notes,
          rejectedAt: now,
          suspendedAt: null,
        },
      }
    case 'suspend':
      return {
        user: { onboardingStatus: 'blocked' },
        psm: {
          verificationStatus: 'suspended',
          isAcceptingPatients: false,
          adminReviewNotes: notes,
          suspendedAt: now,
        },
      }
    case 'request_resubmission':
      return {
        user: { onboardingStatus: 'pending_verification' },
        psm: {
          verificationStatus: 'pending',
          isAcceptingPatients: false,
          adminReviewNotes: notes,
          rejectedAt: null,
          suspendedAt: null,
        },
      }
  }
}

export async function applyPsmVerificationTransition(input: {
  psmUserId: string
  action: PsmVerificationAction
  adminUserId?: string | null
  notes?: string | null
}) {
  const transition = getPsmVerificationTransition(input)

  return prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({
      where: { id: input.psmUserId },
      include: { psm: true, profile: true },
    })

    if (!user || user.role !== 'psm' || !user.psm) {
      throw new Error('Profesional no encontrado')
    }

    const [updatedUser, updatedPsm] = await Promise.all([
      tx.user.update({
        where: { id: input.psmUserId },
        data: transition.user,
      }),
      tx.pSMProfile.update({
        where: { userId: input.psmUserId },
        data: transition.psm,
      }),
    ])

    if (input.action === 'suspend') {
      await tx.match.updateMany({
        where: { psmId: input.psmUserId, status: 'active' },
        data: {
          status: 'paused',
          reason: input.notes || 'PSM suspendido por revisión administrativa',
        },
      })
    }

    return { user: updatedUser, psm: updatedPsm }
  })
}

export function isVerificationStatus(value: string): value is VerificationStatus {
  return ['pending', 'approved', 'rejected', 'suspended'].includes(value)
}
