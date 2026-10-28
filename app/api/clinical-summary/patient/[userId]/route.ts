import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError } from '@/lib/auth/session'
import { requireMatchedUserAccess } from '@/lib/auth/guards'
import { recordClinicalAccess } from '@/lib/clinical-audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const session = await requireMatchedUserAccess(request, userId)

    const rows = await prisma.consentedClinicalSummary.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: userId,
      action: 'list',
      resource: 'consented_summary',
      reason: 'consented_summary_psm_read',
    })

    return NextResponse.json({
      summaries: rows.map((row) => ({
        id: row.id,
        title: row.title,
        summaryText: row.summaryText,
        createdAt: row.createdAt.toISOString(),
        fhirDocumentReference: row.fhirDocumentReference,
      })),
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}
