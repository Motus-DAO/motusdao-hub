import { NextRequest, NextResponse } from 'next/server'
import { getAIModel, getAIProvider, getVeniceApiKey, getVeniceBaseUrl, hasAIKey } from '@/lib/ai-client'
import { requireAiProcessingConsent } from '@/lib/auth/ai-consent'
import { handleAuthError } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAiProcessingConsent(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub para usar la IA.' }, { status: 403 })
    }
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }

  if (getAIProvider() !== 'venice' || !hasAIKey()) {
    return NextResponse.json({ error: 'E2EE solo está disponible con Venice.' }, { status: 503 })
  }

  const model = getAIModel()
  if (!model.startsWith('e2ee-')) {
    return NextResponse.json({ error: 'El modelo configurado no acepta cifrado desde el navegador.' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const nonce = typeof body?.nonce === 'string' ? body.nonce : ''
  if (!/^[0-9a-f]{64}$/.test(nonce)) {
    return NextResponse.json({ error: 'Falta la prueba de este envío.' }, { status: 400 })
  }

  const response = await fetch(
    `${getVeniceBaseUrl()}/tee/attestation?model=${encodeURIComponent(model)}&nonce=${nonce}`,
    { headers: { Authorization: `Bearer ${getVeniceApiKey()}` } }
  )
  const attestation = await response.json().catch(() => null)
  if (!response.ok || !attestation || attestation.verified !== true || attestation.nonce !== nonce) {
    return NextResponse.json({ error: 'No se pudo comprobar el enclave.' }, { status: 502 })
  }
  if (attestation.debug === true) {
    return NextResponse.json({ error: 'El enclave está en modo de depuración.' }, { status: 502 })
  }

  return NextResponse.json({
    verified: true,
    nonce: attestation.nonce,
    debug: false,
    signing_key: attestation.signing_key || attestation.signing_public_key,
    signing_address: attestation.signing_address,
  })
}
