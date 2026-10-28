import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { assertSelfOrAdmin } from '@/lib/auth/guards'
import {
  handleClinicalAuditError,
  recordClinicalAccess,
} from '@/lib/clinical-audit'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const existing = await prisma.consentedClinicalSummary.findUnique({
      where: { id },
    })
    if (!existing || existing.revokedAt) {
      return NextResponse.json({ success: true })
    }

    assertSelfOrAdmin(session, existing.userId)

    await prisma.$transaction(async (tx) => {
      await tx.consentedClinicalSummary.update({
        where: { id },
        data: { revokedAt: new Date() },
      })
      await recordClinicalAccess(
        {
          request,
          actorUserId: session.userId,
          targetUserId: existing.userId,
          action: 'delete',
          resource: 'consented_summary',
          resourceId: id,
          reason: 'consented_summary_revoke',
        },
        tx
      )
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    const auditResponse = handleClinicalAuditError(error)
    if (auditResponse) return auditResponse
    throw error
  }
}
