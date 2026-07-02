import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { asStringArray } from '@/lib/prisma-json'
import { guardAdmin } from '@/lib/auth/admin-route'
import { isVerificationStatus } from '@/lib/psm-verification'
import { buildPsmAdminOperationsView } from '@/lib/intake/psm-admin-view'
import { getPsmMarketplaceVisibility } from '@/lib/psm/marketplace-visibility'

export async function GET(request: NextRequest) {
  try {
    const denied = await guardAdmin(request)
    if (denied) return denied

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const skip = (page - 1) * limit

    // Get all PSM users with related data
    const psms = await prisma.user.findMany({
      where: {
        role: 'psm',
        ...(isVerificationStatus(status)
          ? { psm: { is: { verificationStatus: status } } }
          : {})
      },
      include: {
        profile: true,
        psm: true,
        psmMatches: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        sessionsAsPSM: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        paymentsReceived: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform and filter PSMs
    let psmsData = psms.map(psm => {
      const especialidades = asStringArray(psm.psm?.especialidades)

      const activeMatches = psm.psmMatches.filter(m => m.status === 'active')
      const totalMatches = psm.psmMatches.length
      const completedSessions = psm.sessionsAsPSM.filter(s => s.status === 'completed').length
      const totalSessions = psm.sessionsAsPSM.length
      
      // Calculate total revenue
      const totalRevenue = psm.paymentsReceived.reduce((sum, payment) => {
        try {
          const amount = parseFloat(payment.amount) || 0
          return sum + amount
        } catch {
          return sum
        }
      }, 0)

      const operations = buildPsmAdminOperationsView(psm.psm)

      return {
        id: psm.id,
        email: psm.email,
        eoaAddress: psm.eoaAddress,
        smartWalletAddress: psm.smartWalletAddress,
        privyId: psm.privyId,
        authProvider: psm.authProvider,
        authProviderId: psm.authProviderId,
        nombre: psm.profile?.nombre || '',
        apellido: psm.profile?.apellido || '',
        telefono: psm.profile?.telefono || '',
        avatarUrl: psm.profile?.avatarUrl || null,
        ciudad: psm.profile?.ciudad || '',
        pais: psm.profile?.pais || '',
        bio: psm.psm?.biografia || psm.profile?.bio || '',
        professionalNarrative: operations.professionalNarrative,
        therapyStyles: operations.therapyStyles,
        languages: operations.languages,
        timezone: operations.timezone,
        acceptsSlidingScale: operations.acceptsSlidingScale,
        operations,
        cedulaProfesional: psm.psm?.cedulaProfesional || '',
        cedulaDocumentPath: psm.psm?.cedulaDocumentPath || null,
        tituloDocumentPath: psm.psm?.tituloDocumentPath || null,
        formacionAcademica: psm.psm?.formacionAcademica || '',
        experienciaAnios: psm.psm?.experienciaAnios || 0,
        especialidades: especialidades,
        participaSupervision: psm.psm?.participaSupervision || false,
        participaCursos: psm.psm?.participaCursos || false,
        participaInvestigacion: psm.psm?.participaInvestigacion || false,
        participaComunidad: psm.psm?.participaComunidad || false,
        verificationStatus: psm.psm?.verificationStatus || 'pending',
        slug: psm.psm?.slug || null,
        introVideoApproved: psm.psm?.introVideoApproved || false,
        introVideoStoragePath: psm.psm?.introVideoStoragePath || null,
        tagline: psm.psm?.tagline || null,
        onboardingStatus: psm.onboardingStatus,
        adminReviewNotes: psm.psm?.adminReviewNotes || '',
        isAcceptingPatients: psm.psm?.isAcceptingPatients || false,
        maxActivePatients: psm.psm?.maxActivePatients || 10,
        verifiedAt: psm.psm?.verifiedAt || null,
        rejectedAt: psm.psm?.rejectedAt || null,
        suspendedAt: psm.psm?.suspendedAt || null,
        registrationCompleted: psm.registrationCompleted,
        marketplace: getPsmMarketplaceVisibility({
          registrationCompleted: psm.registrationCompleted,
          onboardingStatus: psm.onboardingStatus,
          deletedAt: psm.deletedAt,
          psm: psm.psm
            ? {
                verificationStatus: psm.psm.verificationStatus,
                isAcceptingPatients: psm.psm.isAcceptingPatients,
                introVideoApproved: psm.psm.introVideoApproved,
                slug: psm.psm.slug,
              }
            : null,
        }),
        activeMatches: activeMatches.length,
        totalMatches: totalMatches,
        completedSessions,
        totalSessions,
        totalRevenue,
        capacity: {
          current: activeMatches.length,
          max: psm.psm?.maxActivePatients || 10,
          available: Math.max((psm.psm?.maxActivePatients || 10) - activeMatches.length, 0)
        },
        createdAt: psm.createdAt,
        updatedAt: psm.updatedAt
      }
    })

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      psmsData = psmsData.filter(psm => 
        psm.nombre.toLowerCase().includes(searchLower) ||
        psm.apellido.toLowerCase().includes(searchLower) ||
        psm.email.toLowerCase().includes(searchLower) ||
        psm.cedulaProfesional.toLowerCase().includes(searchLower) ||
        psm.especialidades.some(esp => esp.toLowerCase().includes(searchLower))
      )
    }

    // Get total count for pagination
    const total = psmsData.length

    // Apply pagination
    const paginatedPsms = psmsData.slice(skip, skip + limit)

    return NextResponse.json({
      success: true,
      psms: paginatedPsms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching PSMs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}










