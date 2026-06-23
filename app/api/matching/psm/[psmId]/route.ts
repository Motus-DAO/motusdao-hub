import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import { recordClinicalAccess } from '@/lib/clinical-audit'

/**
 * GET /api/matching/psm/[psmId]
 * Gets all matched users for a PSM (active and history)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ psmId: string }> }
) {
  try {
    const { psmId } = await params
    const session = await requireSelfOrAdmin(request, psmId)

    const psm = await prisma.user.findUnique({
      where: { id: psmId },
      include: {
        psm: true,
        psmMatches: {
          include: {
            user: {
              include: {
                profile: true,
                patient: true
              }
            }
          },
          orderBy: {
            matchedAt: 'desc'
          }
        }
      }
    })

    if (!psm) {
      return NextResponse.json(
        { error: 'Profesional no encontrado' },
        { status: 404 }
      )
    }

    if (psm.role !== 'psm') {
      return NextResponse.json(
        { error: 'El usuario no es un profesional' },
        { status: 400 }
      )
    }

    // Separate active and history
    const activeMatches = psm.psmMatches.filter(m => m.status === 'active')
    const matchHistory = psm.psmMatches.filter(m => m.status !== 'active')
    const maxActivePatients = psm.psm?.maxActivePatients ?? 10

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: psmId,
      action: 'read',
      resource: 'match',
      reason: 'psm_match_history',
    })

    return NextResponse.json({
      activeMatches: activeMatches.map(m => ({
        id: m.id,
        userId: m.userId,
        status: m.status,
        matchedAt: m.matchedAt,
        user: {
          id: m.user.id,
          email: m.user.email,
          nombre: m.user.profile?.nombre,
          apellido: m.user.profile?.apellido,
          telefono: m.user.profile?.telefono,
          ciudad: m.user.profile?.ciudad,
          pais: m.user.profile?.pais,
          avatarUrl: m.user.profile?.avatarUrl,
          problematica: m.user.patient?.problematica,
          tipoAtencion: m.user.patient?.tipoAtencion,
          smartWalletAddress: m.user.smartWalletAddress,
          eoaAddress: m.user.eoaAddress
        }
      })),
      matchHistory: matchHistory.map(m => ({
        id: m.id,
        userId: m.userId,
        status: m.status,
        matchedAt: m.matchedAt,
        endedAt: m.endedAt,
        reason: m.reason,
        user: {
          id: m.user.id,
          nombre: m.user.profile?.nombre,
          apellido: m.user.profile?.apellido
        }
      })),
      capacity: {
        current: activeMatches.length,
        max: maxActivePatients,
        available: Math.max(maxActivePatients - activeMatches.length, 0)
      }
    })

  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching PSM matches:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

