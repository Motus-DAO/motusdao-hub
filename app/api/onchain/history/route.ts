import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { sessionOwnsSpendAddress } from '@/lib/platform-spend-guard'
import { isValidCeloAddress } from '@/lib/ripio/ramps-widget'
import { fetchBlockscoutHistory, type OnchainHistoryItem } from '@/lib/onchain/history'

export const runtime = 'nodejs'

/** Blockscout is public; a short cache keeps a tab open from hammering it. */
const CACHE_MS = 15_000
const CACHE_MAX_ENTRIES = 500
const cache = new Map<string, { at: number; items: OnchainHistoryItem[] }>()

/**
 * GET /api/onchain/history?address=0x…
 *
 * Sent/received movements for the signed-in wallet. Session-bound: the address
 * must match the SIWE EOA. Layer 1 reads Blockscout; the UI contract stays the
 * same when this swaps to `onchain_transactions`.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    const address = (request.nextUrl.searchParams.get('address') || '').trim()

    if (!isValidCeloAddress(address)) {
      return NextResponse.json(
        { error: 'address inválida (se espera 0x + 40 hex)' },
        { status: 400 }
      )
    }

    if (!sessionOwnsSpendAddress(session, address)) {
      return NextResponse.json(
        { error: 'La dirección no coincide con tu sesión.' },
        { status: 403 }
      )
    }

    const key = address.toLowerCase()
    const cached = cache.get(key)
    if (cached && Date.now() - cached.at < CACHE_MS) {
      return NextResponse.json({ items: cached.items, cached: true })
    }

    const items = await fetchBlockscoutHistory(address)

    if (cache.size >= CACHE_MAX_ENTRIES) cache.clear()
    cache.set(key, { at: Date.now(), items })

    return NextResponse.json({ items, cached: false })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('[onchain/history]', error)
    return NextResponse.json(
      { error: 'No se pudo cargar el historial. Intenta de nuevo en un momento.' },
      { status: 502 }
    )
  }
}
