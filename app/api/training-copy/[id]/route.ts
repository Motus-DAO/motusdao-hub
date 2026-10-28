import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import {
  handleClinicalAuditError,
  recordClinicalAccess,
} from '@/lib/clinical-audit'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const { id } = await context.params
    const row = await prisma.trainingCopyContribution.findFirst({
      where: { id, userId: session.userId, revokedAt: null },
    })
    if (!row) {
      return NextResponse.json({ error: 'No encontramos esa copia.' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.trainingCopyContribution.update({
        where: { id: row.id },
        data: { revokedAt: new Date(), payoutStatus: 'cancelled' },
      })
      await recordClinicalAccess(
        {
          request,
          actorUserId: session.userId,
          targetUserId: session.userId,
          action: 'training_copy.revoke',
          resource: 'training_copy',
          resourceId: row.id,
        },
        tx
      )
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const auditResponse = handleClinicalAuditError(error)
    if (auditResponse) return auditResponse
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}
