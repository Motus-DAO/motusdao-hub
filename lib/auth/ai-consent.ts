import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth/errors'
import { requireSession, type AuthContext } from '@/lib/auth/session'

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
