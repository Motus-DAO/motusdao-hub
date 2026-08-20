import { NextRequest, NextResponse } from 'next/server'
import { submitTextileSwap, hasTextileApiKey } from '@/lib/textile/server'

export async function POST(request: NextRequest) {
  try {
    if (!hasTextileApiKey()) {
      return NextResponse.json({ error: 'TEXTILE_API_KEY no configurada' }, { status: 503 })
    }

    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const txHash = typeof body.txHash === 'string' ? body.txHash.trim() : ''

    if (!id || !txHash.startsWith('0x')) {
      return NextResponse.json({ error: 'id y txHash son requeridos' }, { status: 400 })
    }

    const result = await submitTextileSwap(id, txHash)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status >= 400 && result.status < 600 ? result.status : 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[textile/submit]', error)
    return NextResponse.json(
      {
        error: 'No se pudo reportar el swap',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
