import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth/errors'
import { requireSession, type AuthContext } from '@/lib/auth/session'

/**
 * Onboarding runs before the User row exists. Resolve (or create) a provisional
 * user keyed by the signed-in wallet so the AI consent and the intake can use
 * the same userId the final onboarding step will update.
 */
export async function resolveOnboardingAiUserId(
  session: AuthContext
): Promise<string> {
  if (session.userId) return session.userId

  const eoa = session.eoaAddress.toLowerCase()
  const user = await prisma.user.upsert({
    where: { eoaAddress: eoa },
    update: {},
    create: {
      email: `${eoa}@wallet.motusdao.org`,
      eoaAddress: eoa,
      role: 'usuario',
      registrationCompleted: false,
      onboardingStatus: 'wallet_connected',
      intakeSource: 'ai_assisted',
    },
    select: { id: true },
  })
  return user.id
}

/**
 * Onboarding AI guard: resolves the provisional user, then requires the stored
 * AI-processing consent. Used only by the onboarding AI intake.
 */
export async function requireOnboardingAiConsent(
  request: NextRequest
): Promise<AuthContext & { userId: string }> {
  const session = await requireSession(request)
  const userId = await resolveOnboardingAiUserId(session)

  const record = await prisma.consentRecord.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { acceptedAt: 'desc' },
    select: { consentToAIProcessing: true },
  })

  if (!record?.consentToAIProcessing) {
    throw new AuthError(
      403,
      'Falta el consentimiento para procesar el mensaje con IA.'
    )
  }

  return { ...session, userId }
}

/**
 * The model must not be called unless this wallet already has a stored yes.
 */
export async function requireAiProcessingConsent(
  request: NextRequest
): Promise<AuthContext> {
  const session = await requireSession(request)
  if (!session.userId) {
    throw new AuthError(403, 'Se necesita una cuenta del Hub para usar la IA.')
  }

  const record = await prisma.consentRecord.findFirst({
    where: { userId: session.userId, revokedAt: null },
    orderBy: { acceptedAt: 'desc' },
    select: { consentToAIProcessing: true },
  })

  if (!record?.consentToAIProcessing) {
    throw new AuthError(
      403,
      'Falta el consentimiento para procesar el mensaje con IA.'
    )
  }

  return session
}

export async function hasStoredAiProcessingConsent(userId: string): Promise<boolean> {
  const record = await prisma.consentRecord.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { acceptedAt: 'desc' },
    select: { consentToAIProcessing: true },
  })
  return record?.consentToAIProcessing === true
}
