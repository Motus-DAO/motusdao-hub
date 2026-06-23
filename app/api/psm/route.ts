import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { asStringArray } from '@/lib/prisma-json'

/**
 * GET /api/psm
 * Gets all PSMs (psychotherapists) with their profiles
 */
export async function GET() {
  try {
    const psms = await prisma.user.findMany({
      where: {
        role: 'psm',
        registrationCompleted: true,
        onboardingStatus: 'active',
        deletedAt: null,
        psm: {
          is: {
            verificationStatus: 'approved',
            isAcceptingPatients: true,
          }
        }
      },
      include: {
        profile: true,
        psm: true,
        psmMatches: {
          where: { status: 'active' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform PSMs to include relevant information
    const psmsData = psms.map(psm => {
      const especialidades = asStringArray(psm.psm?.especialidades)

      return {
        id: psm.id,
        email: psm.email,
        nombre: psm.profile?.nombre || '',
        apellido: psm.profile?.apellido || '',
        avatarUrl: psm.profile?.avatarUrl || null,
        bio: psm.psm?.biografia || psm.profile?.bio || '',
        cedulaProfesional: psm.psm?.cedulaProfesional || '',
        formacionAcademica: psm.psm?.formacionAcademica || '',
        experienciaAnios: psm.psm?.experienciaAnios || 0,
        especialidades: especialidades,
        ciudad: psm.profile?.ciudad || '',
        pais: psm.profile?.pais || '',
        language: psm.profile?.language || 'es',
        activeMatches: psm.psmMatches.length,
        capacity: {
          current: psm.psmMatches.length,
          max: psm.psm?.maxActivePatients || 10,
          available: Math.max((psm.psm?.maxActivePatients || 10) - psm.psmMatches.length, 0)
        },
        createdAt: psm.createdAt,
        updatedAt: psm.updatedAt
      }
    })

    return NextResponse.json({
      success: true,
      psms: psmsData
    })

  } catch (error) {
    console.error('Error fetching PSMs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}










