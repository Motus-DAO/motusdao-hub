import { NextRequest, NextResponse } from 'next/server'

/** Phase 2 — session enclave attestation gate (stub until infra ships). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')?.trim()
  if (!url) {
    return NextResponse.json({ error: 'Indica ?url= del proxy enclave.' }, { status: 400 })
  }

  const mockOk = process.env.PSYCHAT_ENCLAVE_ATTESTATION_MOCK_OK === 'true'
  const configured = process.env.NEXT_PUBLIC_PSYCHAT_SESSION_ENCLAVE_URL?.trim()

  if (mockOk && configured && url.startsWith(configured.replace(/\/$/, ''))) {
    return NextResponse.json({
      ok: true,
      measurement: 'mock-build-rootrouter-enclave',
      url,
    })
  }

  return NextResponse.json({
    ok: false,
    error:
      'Attestation de enclave de sesión no disponible en este entorno. Usa memoria local (RootRouter en tu PC) o modo estándar Hub.',
    url,
  })
}
