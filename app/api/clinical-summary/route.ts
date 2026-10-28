import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { buildConsentedSummaryDocumentReference } from '@/lib/fhir/document-reference'
import {
  getActiveMatchForPatient,
  hasClinicalSummaryShareConsent,
} from '@/lib/clinical-summary/consent'
import { CLINICAL_SUMMARY_MAX_CHARS } from '@/lib/clinical-summary/constants'
import {
  handleClinicalAuditError,
  recordClinicalAccess,
} from '@/lib/clinical-audit'

function serializeSummary(row: {
  id: string
  title: string | null
  summaryText: string
  matchId: string
  psmId: string
  createdAt: Date
  revokedAt: Date | null
  fhirDocumentReference: unknown
}) {
  return {
    id: row.id,
    title: row.title,
    summaryText: row.summaryText,
    matchId: row.matchId,
    psmId: row.psmId,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    fhirDocumentReference: row.fhirDocumentReference,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const rows = await prisma.consentedClinicalSummary.findMany({
      where: { userId: session.userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      summaries: rows.map(serializeSummary),
      canShare: await hasClinicalSummaryShareConsent(session.userId),
      activeMatch: await getActiveMatchForPatient(session.userId),
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const allowed = await hasClinicalSummaryShareConsent(session.userId)
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            'Activa “compartir con profesional” en tu registro o perfil antes de enviar un resumen.',
        },
        { status: 403 }
      )
    }

    const body = (await request.json().catch(() => null)) as {
      summaryText?: string
      title?: string
      matchId?: string
      confirmNotExpediente?: boolean
    } | null

    if (!body?.confirmNotExpediente) {
      return NextResponse.json(
        { error: 'Confirma que entiendes que esto no es un expediente clínico.' },
        { status: 400 }
      )
    }

    const summaryText = body.summaryText?.trim() ?? ''
    if (summaryText.length < 20) {
      return NextResponse.json(
        { error: 'Escribe al menos un párrafo breve (20 caracteres o más).' },
        { status: 400 }
      )
    }
    if (summaryText.length > CLINICAL_SUMMARY_MAX_CHARS) {
      return NextResponse.json({ error: 'El resumen es demasiado largo.' }, { status: 400 })
    }

    let match = body.matchId
      ? await prisma.match.findFirst({
          where: { id: body.matchId, userId: session.userId, status: 'active' },
        })
      : await getActiveMatchForPatient(session.userId)

    if (!match) {
      return NextResponse.json(
        { error: 'Necesitas un emparejamiento activo con un profesional.' },
        { status: 403 }
      )
    }

    const title = body.title?.trim().slice(0, 120) || null

    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.consentedClinicalSummary.create({
        data: {
          userId: session.userId!,
          matchId: match!.id,
          psmId: match!.psmId,
          title,
          summaryText,
          fhirDocumentReference: {},
        },
      })
      const fhirDocumentReference = buildConsentedSummaryDocumentReference({
        summaryId: created.id,
        userId: session.userId!,
        summaryText,
        title,
        createdAt: created.createdAt,
      })
      const updated = await tx.consentedClinicalSummary.update({
        where: { id: created.id },
        data: { fhirDocumentReference },
      })
      await recordClinicalAccess(
        {
          request,
          actorUserId: session.userId,
          targetUserId: session.userId,
          action: 'create',
          resource: 'consented_summary',
          resourceId: created.id,
          reason: 'consented_summary_share',
        },
        tx
      )
      return updated
    })

    return NextResponse.json({ summary: serializeSummary(row) })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    const auditResponse = handleClinicalAuditError(error)
    if (auditResponse) return auditResponse
    throw error
  }
}
