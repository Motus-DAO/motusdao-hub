import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { hasStoredPsychatArchiveConsent } from '@/lib/auth/psychat-archive-consent'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }
    const enabled = await hasStoredPsychatArchiveConsent(session.userId)
    return NextResponse.json({ consentToPsychatArchive: enabled })
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

    await prisma.consentRecord.create({
      data: {
        userId: session.userId,
        consentToTerms: previous?.consentToTerms ?? false,
        consentToPrivacy: previous?.consentToPrivacy ?? false,
        consentToAIProcessing: previous?.consentToAIProcessing ?? false,
        consentToShareWithPSM: previous?.consentToShareWithPSM ?? false,
        consentToClinicalMatching: previous?.consentToClinicalMatching ?? false,
        consentToPsychatArchive: body.enabled,
        source: 'psychat_archive',
        policyVersion: previous?.policyVersion ?? '2026-10-27',
        locale: previous?.locale ?? 'es',
      },
    })

    if (!body.enabled) {
      await prisma.psychatArchiveSnapshot.deleteMany({
        where: { userId: session.userId },
      })
    }

    return NextResponse.json({ consentToPsychatArchive: body.enabled })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}
