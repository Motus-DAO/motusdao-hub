import { NextRequest, NextResponse } from 'next/server'
import {
  isRipioRampFlow,
  isValidCeloAddress,
  isValidUuid,
  requestRipioWidgetToken,
  shouldUseRipioMock,
} from '@/lib/ripio/ramps-widget'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const address = typeof body.address === 'string' ? body.address.trim() : ''
    const externalRef =
      typeof body.externalRef === 'string' ? body.externalRef.trim() : ''
    const flow = body.flow

    if (!address || !isValidCeloAddress(address)) {
      return NextResponse.json(
        { error: 'address inválida (se espera 0x + 40 hex)' },
        { status: 400 }
      )
    }

    if (!externalRef || !isValidUuid(externalRef)) {
      return NextResponse.json(
        { error: 'externalRef debe ser un UUID válido' },
        { status: 400 }
      )
    }

    if (!isRipioRampFlow(flow)) {
      return NextResponse.json(
        { error: 'flow debe ser onramp u offramp' },
        { status: 400 }
      )
    }

    if (shouldUseRipioMock()) {
      return NextResponse.json({
        mode: 'mock',
        flow,
        address,
        externalRef,
        reason:
          process.env.RIPIO_MOCK === 'true'
            ? 'RIPIO_MOCK=true'
            : 'missing_credentials',
      })
    }

    const result = await requestRipioWidgetToken({
      address,
      externalRef,
      flow,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          mode: 'error',
          error: result.error,
          details: result.details,
          hint:
            'Verifica RIPIO_CLIENT_ID / RIPIO_CLIENT_SECRET y que Ripio haya habilitado tu cuenta partner. Mientras tanto puedes forzar mock con RIPIO_MOCK=true o quitando las credenciales.',
        },
        { status: result.status >= 400 && result.status < 600 ? result.status : 502 }
      )
    }

    return NextResponse.json({
      mode: 'live',
      flow,
      address,
      externalRef,
      token: result.token,
      widgetUrl: result.widgetUrl,
      expiresHint: 'Token Ripio Widget ~10 horas',
    })
  } catch (error) {
    console.error('[ripio/widget-token]', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
