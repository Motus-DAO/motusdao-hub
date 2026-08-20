import { NextRequest, NextResponse } from 'next/server'
import { isValidCeloAddress } from '@/lib/ripio/ramps-widget'
import {
  fromAtomicAmount,
  isBelowTextileRfqMinimum,
  resolveTextilePair,
  rfqNoQuoteMessage,
  toAtomicAmount,
  TEXTILE_TOKEN_ADDRESSES,
} from '@/lib/textile/fx'
import { requestTextileRfq } from '@/lib/textile/server'

export const maxDuration = 15

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sellSymbol = typeof body.sellSymbol === 'string' ? body.sellSymbol.trim() : ''
    const buySymbol = typeof body.buySymbol === 'string' ? body.buySymbol.trim() : ''
    const sellAmount = typeof body.sellAmount === 'string' ? body.sellAmount.trim() : ''
    const taker = typeof body.taker === 'string' ? body.taker.trim() : ''

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

    if (isBelowTextileRfqMinimum(sellAmount)) {
      return NextResponse.json(
        { error: `El mínimo RFQ es 1 ${pair.sellSymbol} entero.` },
        { status: 400 }
      )
    }

    if (!isValidCeloAddress(taker)) {
      return NextResponse.json({ error: 'taker inválido' }, { status: 400 })
    }

    const built = await requestTextileRfq({
      sellToken: TEXTILE_TOKEN_ADDRESSES[pair.sellSymbol],
      buyToken: TEXTILE_TOKEN_ADDRESSES[pair.buySymbol],
      sellAmount: toAtomicAmount(sellAmount, pair.sellSymbol),
      taker,
    })

    if (!built.ok) {
      return NextResponse.json(
        { error: built.error },
        { status: built.status >= 400 && built.status < 600 ? built.status : 502 }
      )
    }

    if (built.data.status !== 'quoted' || !built.data.transactions?.swap) {
      const availableSell = built.data.availableSellAmount
        ? fromAtomicAmount(built.data.availableSellAmount, pair.sellSymbol)
        : null
      return NextResponse.json({
        fillable: false,
        status: built.data.status,
        reason: built.data.reason || 'no_quote',
        hint: availableSell
          ? `${rfqNoQuoteMessage(built.data.reason)} Profundidad publicada: ~${availableSell} ${pair.sellSymbol}.`
          : rfqNoQuoteMessage(built.data.reason),
        availableSellAmount: availableSell,
      })
    }

    const quote = built.data.quote
    return NextResponse.json({
      fillable: true,
      venue: 'v2',
      id: built.data.rfqId,
      claimToken: built.data.claimToken,
      status: built.data.status,
      expiresAt: quote?.expiresAt,
      orderDeadline: quote?.orderDeadline,
      buyAmount: quote?.buyAmount
        ? fromAtomicAmount(quote.buyAmount, pair.buySymbol)
        : null,
      takerPays: quote?.takerPays,
      feeAmount: quote?.feeAmount,
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
