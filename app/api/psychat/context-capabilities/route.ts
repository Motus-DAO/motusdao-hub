import { NextResponse } from 'next/server'
import { ROOTROUTER_DEFAULT_PROXY_URL } from '@/lib/psychat-context/constants'

export async function GET() {
  const sessionEnclaveUrl = process.env.NEXT_PUBLIC_PSYCHAT_SESSION_ENCLAVE_URL?.trim() || ''
  const alwaysOnEnabled = process.env.NEXT_PUBLIC_PSYCHAT_ALWAYS_ON_ENCLAVE === 'true'

  return NextResponse.json({
    defaultLocalProxyUrl: ROOTROUTER_DEFAULT_PROXY_URL,
    sessionEnclaveUrl,
    sessionEnclaveEnabled: Boolean(sessionEnclaveUrl),
    alwaysOnEnclaveEnabled: alwaysOnEnabled,
    docsPath: '/psychat/memoria-contexto',
  })
}
