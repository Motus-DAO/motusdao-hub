import { NextResponse } from 'next/server'
import { getUsdToMxnRate } from '@/lib/academy/fx'

export async function GET() {
  try {
    const quote = await getUsdToMxnRate()
    return NextResponse.json({
      base: 'USD',
      quote: 'MXN',
      rate: quote.rate,
      date: quote.date,
      source: quote.source,
    })
  } catch (error) {
    console.error('Error fetching USD/MXN rate:', error)
    return NextResponse.json({ error: 'No se pudo obtener el tipo de cambio' }, { status: 502 })
  }
}
