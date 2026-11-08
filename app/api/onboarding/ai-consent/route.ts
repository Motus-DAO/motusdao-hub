import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { resolveOnboardingAiUserId } from '@/lib/auth/ai-consent'

const POLICY_VERSION = '2026-10-27'

/**
 * Persist the AI-processing consent during onboarding, before the AI intake.
 * The final onboarding submit writes the full consent record; this one only
 * unlocks the model call for the intake chat.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request)
    const userId = await resolveOnboardingAiUserId(session)

    const latest = await prisma.consentRecord.findFirst({
      where: { userId, revokedAt: null },
      orderBy: { acceptedAt: 'desc' },
      select: { consentToAIProcessing: true },
    })

    if (latest?.consentToAIProcessing) {
      return NextResponse.json({ ok: true })
    }

    await prisma.consentRecord.create({
      data: {
        userId,
        consentToAIProcessing: true,
        source: 'onboarding_ai_intake',
        policyVersion: POLICY_VERSION,
        locale: 'es',
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    console.error('Error saving onboarding AI consent:', error)
    return NextResponse.json(
      { error: 'No se pudo guardar el consentimiento.' },
      { status: 500 }
    )
  }
}
