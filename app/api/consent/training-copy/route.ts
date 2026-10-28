import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { consentFlagsFromPrevious } from '@/lib/consent/copy-previous-flags'
import { hasTrainingCopyConsent } from '@/lib/training-copy/consent'
import { TRAINING_COPY_POLICY_VERSION } from '@/lib/training-copy/constants'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }
    const enabled = await hasTrainingCopyConsent(session.userId)
    return NextResponse.json({
      consentToTrainingCopy: enabled,
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

    const body = (await request.json().catch(() => null)) as { enabled?: boolean } | null
    if (typeof body?.enabled !== 'boolean') {
      return NextResponse.json({ error: 'Indica enabled: true o false.' }, { status: 400 })
    }

    const previous = await prisma.consentRecord.findFirst({
      where: { userId: session.userId, revokedAt: null },
      orderBy: { acceptedAt: 'desc' },
    })

    if (!previous?.consentToPrivacy) {
      return NextResponse.json(
        { error: 'Necesitas haber aceptado el aviso de privacidad antes de este consentimiento.' },
        { status: 403 }
      )
    }

    await prisma.consentRecord.create({
      data: {
        userId: session.userId,
        ...consentFlagsFromPrevious(previous),
        consentToTrainingCopy: body.enabled,
        source: 'training_copy',
        policyVersion: TRAINING_COPY_POLICY_VERSION,
      },
    })

    if (!body.enabled) {
      await prisma.trainingCopyContribution.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date(), payoutStatus: 'cancelled' },
      })
    }

    return NextResponse.json({ consentToTrainingCopy: body.enabled })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}
