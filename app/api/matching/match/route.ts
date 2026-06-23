import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { asStringArray, toInputJson } from '@/lib/prisma-json'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import { recordClinicalAccess } from '@/lib/clinical-audit'

/**
 * POST /api/matching/match
 * Creates an automatic match between a user and a PSM
 * 
 * Body: { userId: string }
 * 
 * Matching algorithm:
 * - Finds available PSMs (less than 10 active matches)
 * - Scores PSMs based on problematica vs especialidades
 * - Creates match with best scoring PSM
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      )
    }

    const session = await requireSelfOrAdmin(request, userId)

    // Get user with profile and patient data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        patient: true,
        userMatches: {
          where: { status: 'active' },
          include: {
            psm: {
              include: {
                profile: true,
                psm: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if (user.role !== 'usuario') {
      return NextResponse.json(
        { error: 'Solo los usuarios pueden ser emparejados automáticamente' },
        { status: 400 }
      )
    }

    if (!user.patient) {
      return NextResponse.json(
        { error: 'El usuario no tiene perfil de paciente completo' },
        { status: 400 }
      )
    }

    if (user.onboardingStatus !== 'active' || !user.registrationCompleted) {
      return NextResponse.json(
        { error: 'El usuario aún no tiene un registro activo para matching' },
        { status: 400 }
      )
    }

    if (user.patient.urgencyLevel === 'crisis') {
      return NextResponse.json(
        { error: 'Este caso requiere una ruta de crisis antes de hacer matching automático' },
        { status: 400 }
      )
    }
    const patient = user.patient

    // Check if user already has an active match
    if (user.userMatches.length > 0) {
      return NextResponse.json(
        { 
          error: 'El usuario ya tiene un emparejamiento activo',
          match: user.userMatches[0]
        },
        { status: 400 }
      )
    }

    // Find all PSMs with their active matches
    const allPSMs = await prisma.user.findMany({
      where: {
        role: 'psm',
        registrationCompleted: true,
        onboardingStatus: 'active',
        deletedAt: null,
        psm: {
          is: {
            verificationStatus: 'approved',
            isAcceptingPatients: true
          }
        }
      },
      include: {
        profile: true,
        psm: true,
        psmMatches: {
          where: { status: 'active' }
        }
      }
    })

    // Filter PSMs with available active capacity.
    const availablePSMs = allPSMs.filter(
      psm => psm.psm && psm.psmMatches.length < psm.psm.maxActivePatients
    )

    if (availablePSMs.length === 0) {
      return NextResponse.json(
        { error: 'No hay profesionales disponibles en este momento' },
        { status: 404 }
      )
    }

    // Score PSMs based on matching criteria
    const userConcerns = asStringArray(patient.clinicalConcern)
      .concat(patient.tipoAtencion ? [patient.tipoAtencion] : [])
      .map(item => item.toLowerCase())
    const userLanguages = asStringArray(patient.languages).map(item => item.toLowerCase())
    const scoredPSMs = availablePSMs.map(psm => {
      let score = 0
      const criteria: Array<{ criterion: string; score: number; details?: Record<string, unknown> }> = []
      const addScore = (criterion: string, points: number, details?: Record<string, unknown>) => {
        if (points <= 0) return
        score += points
        criteria.push({ criterion, score: points, details })
      }

      // Check especialidades match
      if (psm.psm && psm.psm.especialidades) {
        const especialidadesLower = asStringArray(psm.psm.especialidades).map(e => e.toLowerCase())

        userConcerns.forEach(concern => {
          if (especialidadesLower.includes(concern)) {
            addScore('clinical_concern_exact', 10, { concern })
          }

          especialidadesLower.forEach(esp => {
            if (concern.includes(esp) || esp.includes(concern)) {
              addScore('clinical_concern_partial', 5, { concern, specialty: esp })
            }
          })
        })
      }

      if (psm.psm) {
        const modalities = asStringArray(psm.psm.modalities)
        if (modalities.includes(patient.preferredModality)) {
          addScore('modality', 4, { modality: patient.preferredModality })
        }

        const psmLanguages = asStringArray(psm.psm.languages).map(item => item.toLowerCase())
        if (userLanguages.some(language => psmLanguages.includes(language))) {
          addScore('language', 3, { patientLanguages: userLanguages, psmLanguages })
        }

        const urgencyLevels = asStringArray(psm.psm.worksWithUrgencyLevels)
        if (urgencyLevels.includes(patient.urgencyLevel)) {
          addScore('urgency', 3, { urgencyLevel: patient.urgencyLevel })
        }
      }

      // Geographic proximity bonus (same city)
      if (user.profile && psm.profile) {
        if (user.profile.ciudad.toLowerCase() === psm.profile.ciudad.toLowerCase()) {
          addScore('same_city', 3, { ciudad: user.profile.ciudad })
        }
        if (user.profile.pais.toLowerCase() === psm.profile.pais.toLowerCase()) {
          addScore('same_country', 2, { pais: user.profile.pais })
        }
      }

      // Experience bonus (more years = slightly better)
      if (psm.psm) {
        addScore('experience', Math.min(psm.psm.experienciaAnios / 10, 2), {
          experienciaAnios: psm.psm.experienciaAnios,
        })
      }

      // Capacity bonus (more available slots = slightly better for load balancing)
      const activeMatches = psm.psmMatches.length
      const maxActivePatients = psm.psm?.maxActivePatients ?? 10
      addScore('capacity', Math.max(maxActivePatients - activeMatches, 0) * 0.1, {
        activeMatches,
        maxActivePatients,
      })

      return { psm, score, criteria }
    })

    // Sort by score (highest first)
    scoredPSMs.sort((a, b) => b.score - a.score)

    // Create match with top scoring PSM
    const topPSM = scoredPSMs[0].psm

    const match = await prisma.match.create({
      data: {
        userId: user.id,
        psmId: topPSM.id,
        status: 'active',
        matchedAt: new Date(),
        source: 'automatic',
        score: scoredPSMs[0].score,
        scoreBreakdown: toInputJson(scoredPSMs[0].criteria),
        criteria: {
          create: scoredPSMs[0].criteria.map(criterion => ({
            criterion: criterion.criterion,
            score: criterion.score,
            details: toInputJson(criterion.details ?? {}),
          })),
        },
      },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        psm: {
          include: {
            profile: true,
            psm: true
          }
        }
      }
    })

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: user.id,
      action: 'create',
      resource: 'match',
      resourceId: match.id,
      reason: 'automatic_matching',
      metadata: {
        psmId: topPSM.id,
        score: scoredPSMs[0].score,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Emparejamiento creado exitosamente',
      match: {
        id: match.id,
        userId: match.userId,
        psmId: match.psmId,
        status: match.status,
        matchedAt: match.matchedAt,
        user: {
          id: match.user.id,
          email: match.user.email,
          nombre: match.user.profile?.nombre,
          apellido: match.user.profile?.apellido
        },
        psm: {
          id: match.psm.id,
          email: match.psm.email,
          nombre: match.psm.profile?.nombre,
          apellido: match.psm.profile?.apellido,
          especialidades: match.psm.psm?.especialidades,
          smartWalletAddress: match.psm.smartWalletAddress
        },
        score: scoredPSMs[0].score
      }
    }, { status: 201 })

  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error creating match:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
