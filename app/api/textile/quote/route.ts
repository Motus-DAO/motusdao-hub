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
import { previewTextileRfq } from '@/lib/textile/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sellSymbol = typeof body.sellSymbol === 'string' ? body.sellSymbol.trim() : ''
    const buySymbol = typeof body.buySymbol === 'string' ? body.buySymbol.trim() : ''
    const sellAmount = typeof body.sellAmount === 'string' ? body.sellAmount.trim() : ''
    const address = typeof body.address === 'string' ? body.address.trim() : ''

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
        {
          error: `El mínimo RFQ es 1 ${pair.sellSymbol} entero.`,
          liveExecution: false,
        },
        { status: 400 }
      )
    }

    if (address && !isValidCeloAddress(address)) {
      return NextResponse.json({ error: 'address inválida' }, { status: 400 })
    }

    const sellAtomic = toAtomicAmount(sellAmount, pair.sellSymbol)
    const preview = await previewTextileRfq({
      sellToken: TEXTILE_TOKEN_ADDRESSES[pair.sellSymbol],
      buyToken: TEXTILE_TOKEN_ADDRESSES[pair.buySymbol],
      sellAmount: sellAtomic,
    })

    if (!preview.ok) {
      return NextResponse.json(
        { error: preview.error, liveExecution: false },
        { status: preview.status >= 400 && preview.status < 600 ? preview.status : 502 }
      )
    }

    if (preview.data.status === 'no_quote' || !preview.data.buyAmount) {
      const availableSell = preview.data.availableSellAmount
        ? fromAtomicAmount(preview.data.availableSellAmount, pair.sellSymbol)
        : null
      return NextResponse.json({
        mode: 'rfq',
        venue: 'v2',
        liveExecution: false,
        status: 'no_quote',
        reason: preview.data.reason,
        sellSymbol: pair.sellSymbol,
        buySymbol: pair.buySymbol,
        sellAmount,
        buyAmount: null,
        availableSellAmount: availableSell,
        hint: availableSell
          ? `${rfqNoQuoteMessage(preview.data.reason)} Profundidad publicada: ~${availableSell} ${pair.sellSymbol}.`
          : rfqNoQuoteMessage(preview.data.reason),
      })
    }

    return NextResponse.json({
      mode: 'rfq',
      venue: 'v2',
      liveExecution: true,
      status: 'preview',
      sellSymbol: pair.sellSymbol,
      buySymbol: pair.buySymbol,
      sellAmount,
      sellAtomic,
      buyAmount: fromAtomicAmount(preview.data.buyAmount, pair.buySymbol),
      takerPays: preview.data.takerPays,
      feeAmount: preview.data.feeAmount,
      effectiveRateRay: preview.data.rateRay,
      availableSellAmount: preview.data.availableSellAmount
        ? fromAtomicAmount(preview.data.availableSellAmount, pair.sellSymbol)
        : null,
      hint: 'Precio indicativo RFQ. Al confirmar pedimos una cotización firme (~30 s).',
    })
  } catch (error) {
    console.error('[textile/quote]', error)
    return NextResponse.json(
      {
        error: 'No se pudo cotizar el swap',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
