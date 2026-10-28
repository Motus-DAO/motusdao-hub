import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError, requireSession, getRequestOrigin } from '@/lib/auth/session'
import { createRootRouterBridgeToken } from '@/lib/auth/rootrouter-bridge-token'
import { hasStoredAiProcessingConsent } from '@/lib/auth/ai-consent'
import { ROOTROUTER_UPSTREAM_PATH } from '@/lib/psychat-context/constants'

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
    const upstreamUrl = `${origin}${ROOTROUTER_UPSTREAM_PATH}`
    const bridgeToken = createRootRouterBridgeToken(session.userId)

    return NextResponse.json({
      upstreamUrl,
      bridgeToken,
      expiresInSeconds: 15 * 60,
      proxyPath: '/v1/chat/completions',
      note:
        'Configura RootRouter para usar esta URL como upstream OpenAI-compatible con esta clave (15 min). Motus no guarda store.json.',
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}
