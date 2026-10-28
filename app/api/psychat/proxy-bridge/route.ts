import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError, requireSession, getRequestOrigin } from '@/lib/auth/session'
import { createRootRouterBridgeToken } from '@/lib/auth/rootrouter-bridge-token'
import { hasStoredAiProcessingConsent } from '@/lib/auth/ai-consent'

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const consent = await hasStoredAiProcessingConsent(session.userId)
    if (!consent) {
      return NextResponse.json({ error: 'Activa el consentimiento de IA en Psychat primero.' }, { status: 403 })
    }

    const origin = getRequestOrigin(request)
    const bridgeToken = createRootRouterBridgeToken(session.userId)

    return NextResponse.json({
      upstreamOrigin: origin,
      upstreamPath: '/v1/chat/completions',
      upstreamUrl: `${origin}/v1/chat/completions`,
      bridgeToken,
      expiresInSeconds: 15 * 60,
      proxyPath: '/v1/chat/completions',
      note:
        'ROOTROUTER_UPSTREAM_ORIGIN = origen del Hub. Psychat envía Authorization Bearer en cada mensaje al proxy.',
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}
