import { NextRequest, NextResponse } from 'next/server'
import { isValidCeloAddress } from '@/lib/ripio/ramps-widget'
import {
  applySlippageRay,
  resolveTextilePair,
  toAtomicAmount,
  TEXTILE_TOKEN_ADDRESSES,
} from '@/lib/textile/fx'
import { buildTextileSwap, hasTextileApiKey } from '@/lib/textile/server'

export async function POST(request: NextRequest) {
  try {
    if (!hasTextileApiKey()) {
      return NextResponse.json(
        {
          error: 'Swap en-app no disponible todavía',
          hint: 'Pide una API key a Textile FX (contact@textilecredit.com) y configura TEXTILE_API_KEY en el servidor. No uses app.textilecredit.com: esa UI no conecta WaaP.',
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const sellSymbol = typeof body.sellSymbol === 'string' ? body.sellSymbol.trim() : ''
    const buySymbol = typeof body.buySymbol === 'string' ? body.buySymbol.trim() : ''
    const sellAmount = typeof body.sellAmount === 'string' ? body.sellAmount.trim() : ''
    const taker = typeof body.taker === 'string' ? body.taker.trim() : ''
    const minRateRay = typeof body.minRateRay === 'string' ? body.minRateRay.trim() : ''

    const pair = resolveTextilePair(sellSymbol, buySymbol)
    if (!pair) {
      return NextResponse.json(
        { error: 'Par no soportado. Usa wARS o wBRL contra USDT en Celo.' },
        { status: 400 }
      )
    }

    if (!sellAmount || Number(sellAmount) <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }

    if (!isValidCeloAddress(taker)) {
      return NextResponse.json({ error: 'taker inválido' }, { status: 400 })
    }

    const built = await buildTextileSwap({
      sellToken: TEXTILE_TOKEN_ADDRESSES[pair.sellSymbol],
      buyToken: TEXTILE_TOKEN_ADDRESSES[pair.buySymbol],
      sellAmount: toAtomicAmount(sellAmount, pair.sellSymbol),
      taker,
      minRate: minRateRay ? applySlippageRay(minRateRay, 50) : undefined,
    })

    if (!built.ok) {
      return NextResponse.json(
        { error: built.error },
        { status: built.status >= 400 && built.status < 600 ? built.status : 502 }
      )
    }

    if (!built.data.fillable || !built.data.transactions?.swap) {
      return NextResponse.json({
        fillable: false,
        reason: built.data.reason || 'no_liquidity',
        liveOrders: built.data.liveOrders ?? 0,
        fillableAmount: built.data.fillableAmount,
      })
    }

    return NextResponse.json({
      fillable: true,
      id: built.data.id,
      fillableAmount: built.data.fillableAmount,
      proceeds: built.data.proceeds,
      requiredAllowance: built.data.requiredAllowance,
      transactions: built.data.transactions,
    })
  } catch (error) {
    console.error('[textile/swap]', error)
    return NextResponse.json(
      {
        error: 'No se pudo armar el swap',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
