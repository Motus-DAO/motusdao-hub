import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  buildPublicPsmProfile,
  getPsmReputationStats,
  PUBLIC_PSM_WHERE,
} from '@/lib/psm/public-profile'

type RouteParams = { params: Promise<{ slug: string }> }

/**
 * GET /api/psm/[slug]
 * Public therapist profile for marketplace + SEO.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params

    const user = await prisma.user.findFirst({
      where: {
        ...PUBLIC_PSM_WHERE,
        psm: { is: { slug } },
      },
      include: {
        profile: true,
        psm: true,
        psmMatches: { where: { status: 'active' } },
      },
    })

    if (!user?.psm) {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }

    const reputationStats = await getPsmReputationStats(user.id)
    const profile = await buildPublicPsmProfile(
      user,
      reputationStats,
      user.psmMatches.length
    )

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no disponible' }, { status: 404 })
    }

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('Error fetching PSM profile:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
