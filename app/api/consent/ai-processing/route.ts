import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { hasStoredAiProcessingConsent } from '@/lib/auth/ai-consent'
import { AuthError } from '@/lib/auth/errors'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      throw new AuthError(403, 'Se necesita una cuenta del Hub para usar la IA.')
    }
    const consentToAIProcessing = await hasStoredAiProcessingConsent(session.userId)
    return NextResponse.json({ consentToAIProcessing })
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
      throw new AuthError(403, 'Se necesita una cuenta del Hub para usar la IA.')
    }

    const body = (await request.json().catch(() => null)) as { accepted?: boolean } | null
    if (body?.accepted !== true) {
      return NextResponse.json(
        { error: 'El consentimiento tiene que ser un sí explícito.' },
        { status: 400 }
      )
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
        consentToAIProcessing: true,
        consentToShareWithPSM: previous?.consentToShareWithPSM ?? false,
        consentToClinicalMatching: previous?.consentToClinicalMatching ?? false,
        source: 'psychat',
        policyVersion: previous?.policyVersion ?? 'v1',
        locale: previous?.locale ?? 'es',
      },
    })

    return NextResponse.json({ consentToAIProcessing: true })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}
