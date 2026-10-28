import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { consentFlagsFromPrevious } from '@/lib/consent/copy-previous-flags'
import {
  handleClinicalAuditError,
  recordClinicalAccess,
} from '@/lib/clinical-audit'
import {
  hasPrivacyNoticeConsent,
  hasTrainingCopyConsent,
  latestConsentFlags,
} from '@/lib/training-copy/consent'
import {
  TRAINING_COMPENSATION_USD_OPTIONS,
  TRAINING_COPY_MAX_CHARS,
  TRAINING_COPY_MIN_CHARS,
  TRAINING_COPY_POLICY_VERSION,
  type TrainingCompensationUsd,
} from '@/lib/training-copy/constants'

function isCompensationUsd(value: number): value is TrainingCompensationUsd {
  return (TRAINING_COMPENSATION_USD_OPTIONS as readonly number[]).includes(value)
}

function serializeRow(row: {
  id: string
  title: string | null
  copyText: string
  compensationUsd: { toString(): string }
  payoutStatus: string
  createdAt: Date
  revokedAt: Date | null
  policyVersion: string
}) {
  return {
    id: row.id,
    title: row.title,
    copyText: row.copyText,
    compensationUsd: Number(row.compensationUsd),
    payoutStatus: row.payoutStatus,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    policyVersion: row.policyVersion,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const rows = await prisma.trainingCopyContribution.findMany({
      where: { userId: session.userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      contributions: rows.map(serializeRow),
      canContribute: await hasPrivacyNoticeConsent(session.userId),
      consentToTrainingCopy: await hasTrainingCopyConsent(session.userId),
      policyVersion: TRAINING_COPY_POLICY_VERSION,
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

    if (!(await hasPrivacyNoticeConsent(session.userId))) {
      return NextResponse.json(
        { error: 'Completa el aviso de privacidad en tu registro antes de aportar copias de entrenamiento.' },
        { status: 403 }
      )
    }

    const body = (await request.json().catch(() => null)) as {
      title?: string
      copyText?: string
      compensationUsd?: number
      confirmVoluntary?: boolean
      confirmCannotUntrain?: boolean
      confirmReidentification?: boolean
      confirmNotExpediente?: boolean
      confirmAuthoredForTraining?: boolean
    } | null

    if (
      !body?.confirmVoluntary ||
      !body.confirmCannotUntrain ||
      !body.confirmReidentification ||
      !body.confirmNotExpediente ||
      !body.confirmAuthoredForTraining
    ) {
      return NextResponse.json({ error: 'Marca todas las confirmaciones del aviso.' }, { status: 400 })
    }

    const copyText = body.copyText?.trim() ?? ''
    if (copyText.length < TRAINING_COPY_MIN_CHARS) {
      return NextResponse.json(
        { error: `Escribe al menos ${TRAINING_COPY_MIN_CHARS} caracteres en claro para esta copia.` },
        { status: 400 }
      )
    }
    if (copyText.length > TRAINING_COPY_MAX_CHARS) {
      return NextResponse.json({ error: 'El texto supera el límite permitido.' }, { status: 400 })
    }

    const compensationUsd = body.compensationUsd ?? 0
    if (!isCompensationUsd(compensationUsd)) {
      return NextResponse.json({ error: 'Compensación inválida (0, 5 o 10 USD).' }, { status: 400 })
    }

    const previous = await latestConsentFlags(session.userId)

    const row = await prisma.$transaction(async (tx) => {
      await tx.consentRecord.create({
        data: {
          userId: session.userId!,
          ...consentFlagsFromPrevious(previous),
          consentToTrainingCopy: true,
          source: 'training_copy_submit',
          policyVersion: TRAINING_COPY_POLICY_VERSION,
        },
      })

      const created = await tx.trainingCopyContribution.create({
        data: {
          userId: session.userId!,
          title: body.title?.trim().slice(0, 120) || null,
          copyText,
          policyVersion: TRAINING_COPY_POLICY_VERSION,
          compensationUsd,
          payoutStatus: compensationUsd > 0 ? 'recorded' : 'none',
        },
      })

      await recordClinicalAccess(
        {
          request,
          actorUserId: session.userId,
          targetUserId: session.userId,
          action: 'training_copy.submit',
          resource: 'training_copy',
          resourceId: created.id,
          metadata: { compensationUsd, payoutStatus: created.payoutStatus },
        },
        tx
      )

      return created
    })

    return NextResponse.json({ contribution: serializeRow(row) })
  } catch (error) {
    const auditResponse = handleClinicalAuditError(error)
    if (auditResponse) return auditResponse
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}
