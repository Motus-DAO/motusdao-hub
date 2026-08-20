import { NextRequest, NextResponse } from 'next/server'
import { isValidCeloAddress } from '@/lib/ripio/ramps-widget'
import {
  fromAtomicAmount,
  indicativeBuyAmount,
  pickTickerPrice,
  resolveTextilePair,
  tickerIdForWfiat,
  toAtomicAmount,
  TEXTILE_TOKEN_ADDRESSES,
} from '@/lib/textile/fx'
import { fetchPublicTickers, fetchTextileQuote, hasTextileApiKey } from '@/lib/textile/server'

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

    if (address && !isValidCeloAddress(address)) {
      return NextResponse.json({ error: 'address inválida' }, { status: 400 })
    }

    const sellAtomic = toAtomicAmount(sellAmount, pair.sellSymbol)
    const tickerId = tickerIdForWfiat(pair.wfiat)
    let localPerUsdt: number | null = null
    try {
      const tickers = await fetchPublicTickers()
      localPerUsdt = pickTickerPrice(tickers.find((row) => row.ticker_id === tickerId))
    } catch (error) {
      console.warn('[textile/quote] tickers', error)
    }

    const indicative = localPerUsdt
      ? indicativeBuyAmount({
          sellSymbol: pair.sellSymbol,
          buySymbol: pair.buySymbol,
          sellAmountHuman: sellAmount,
          localPerUsdt,
        })
      : null

    if (!hasTextileApiKey()) {
      return NextResponse.json({
        mode: 'indicative',
        liveExecution: false,
        sellSymbol: pair.sellSymbol,
        buySymbol: pair.buySymbol,
        sellAmount,
        buyAmount: indicative,
        localPerUsdt,
        hint: 'Cotización pública. Para ejecutar el swap en tu wallet WaaP configura TEXTILE_API_KEY (Textile FX, contact@textilecredit.com).',
      })
    }

    const live = await fetchTextileQuote({
      sellToken: TEXTILE_TOKEN_ADDRESSES[pair.sellSymbol],
      buyToken: TEXTILE_TOKEN_ADDRESSES[pair.buySymbol],
      sellAmount: sellAtomic,
    })

    if (!live.ok) {
      return NextResponse.json(
        {
          mode: 'indicative',
          liveExecution: false,
          sellSymbol: pair.sellSymbol,
          buySymbol: pair.buySymbol,
          sellAmount,
          buyAmount: indicative,
          localPerUsdt,
          error: live.error,
        },
        { status: live.status >= 400 && live.status < 600 ? live.status : 502 }
      )
    }

    const proceeds = live.data.proceeds
    return NextResponse.json({
      mode: 'live',
      liveExecution: Boolean(live.data.hasLiquidity !== false && proceeds),
      sellSymbol: pair.sellSymbol,
      buySymbol: pair.buySymbol,
      sellAmount,
      sellAtomic,
      buyAmount: proceeds ? fromAtomicAmount(proceeds, pair.buySymbol) : indicative,
      fillableAmount: live.data.fillableAmount,
      proceeds,
      effectiveRateRay: live.data.effectiveRateRay,
      fullyFilled: live.data.fullyFilled,
      hasLiquidity: live.data.hasLiquidity,
      localPerUsdt,
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
