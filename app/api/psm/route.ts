import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { asStringArray } from '@/lib/prisma-json'
import {
  buildPublicPsmProfile,
  getPsmReputationStats,
  PUBLIC_PSM_WHERE,
} from '@/lib/psm/public-profile'
import { getEspecialidadLabel } from '@/lib/intake/psm-intake-options'
import { PLATFORM_SESSION_CURRENCY, PLATFORM_SESSION_PRICE_USD } from '@/lib/constants'

/**
 * GET /api/psm
 * Public roster of marketplace-visible PSMs.
 */
export async function GET() {
  try {
    const psms = await prisma.user.findMany({
      where: PUBLIC_PSM_WHERE,
      include: {
        profile: true,
        psm: true,
        psmMatches: {
          where: { status: 'active' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const psmsData = await Promise.all(
      psms.map(async (psm) => {
        const reputationStats = await getPsmReputationStats(psm.id)
        const publicProfile = await buildPublicPsmProfile(
          psm,
          reputationStats,
          psm.psmMatches.length
        )
        if (!publicProfile) return null

        const topSpecialties = publicProfile.topSpecialties
        return {
          id: psm.id,
          slug: publicProfile.slug,
          nombre: publicProfile.nombre,
          apellido: publicProfile.apellido,
          avatarUrl: publicProfile.avatarUrl,
          bio: publicProfile.narratives.sobreMi || publicProfile.narratives.conQueTrabajo,
          experienciaAnios: publicProfile.experienciaAnios,
          topSpecialties,
          topSpecialtyLabels: topSpecialties.map(getEspecialidadLabel),
          languages: publicProfile.languages,
          licenseCountry: publicProfile.licenseCountry,
          licenseCountryLabel: publicProfile.licenseCountryLabel,
          price: {
            amount: PLATFORM_SESSION_PRICE_USD,
            currency: PLATFORM_SESSION_CURRENCY,
          },
          reputation: publicProfile.reputation,
          capacity: {
            current: psm.psmMatches.length,
            max: psm.psm?.maxActivePatients || 10,
            available: publicProfile.capacityAvailable,
          },
          isAvailable: publicProfile.capacityAvailable > 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      psms: psmsData.filter(Boolean),
    })
  } catch (error) {
    console.error('Error fetching PSMs:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
