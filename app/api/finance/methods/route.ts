import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { ripioCountryFromEnv, ripioTokenForCountry } from '@/lib/ripio/public-ramp'

export const dynamic = 'force-dynamic'

/**
 * GET /api/finance/methods
 * Which rails are active for the signed-in user. Wallet is always on.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        eoaAddress: true,
        psm: {
          select: {
            stripeChargesEnabled: true,
            speiClabe: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    const country = ripioCountryFromEnv()

    return NextResponse.json({
      wallet: { active: true, address: user.eoaAddress },
      ripio: {
        active: true,
        recommended: true,
        country,
        token: ripioTokenForCountry(country),
      },
      stripe: { active: user.psm?.stripeChargesEnabled === true },
      spei: { active: Boolean(user.psm?.speiClabe) },
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    console.error('Error reading payment methods:', error)
    return NextResponse.json(
      { error: 'No se pudieron cargar los métodos.' },
      { status: 500 }
    )
  }
}
