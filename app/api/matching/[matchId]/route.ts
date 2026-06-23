import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMatchParticipantOrAdmin } from '@/lib/auth/guards'
import { guardAdmin } from '@/lib/auth/admin-route'
import { handleAuthError } from '@/lib/auth/session'
import { recordClinicalAccess } from '@/lib/clinical-audit'

/**
 * PUT /api/matching/[matchId]
 * Updates match status (pause, resume, end)
 * 
 * Body: { status: 'active' | 'paused' | 'ended', reason?: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params
    const { session, match: authorizedMatch } = await requireMatchParticipantOrAdmin(request, matchId)
    const body = await request.json()
    const { status, reason } = body

    if (!status || !['active', 'paused', 'ended'].includes(status)) {
      return NextResponse.json(
        { error: 'status debe ser "active", "paused" o "ended"' },
        { status: 400 }
      )
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId }
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Emparejamiento no encontrado' },
        { status: 404 }
      )
    }

    const updateData: {
      status: 'active' | 'paused' | 'ended'
      endedAt?: Date | null
      reason?: string | null
    } = {
      status: status as 'active' | 'paused' | 'ended'
    }

    if (status === 'ended') {
      updateData.endedAt = new Date()
      if (reason) {
        updateData.reason = reason
      }
    } else if (status === 'active') {
      // When reactivating, clear endedAt and reason if they exist
      updateData.endedAt = null
      updateData.reason = null
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
      include: {
        user: {
          include: {
            profile: true
          }
        },
        psm: {
          include: {
            profile: true
          }
        }
      }
    })

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: authorizedMatch.userId,
      action: 'update',
      resource: 'match',
      resourceId: matchId,
      reason: `match_${status}`,
      metadata: { psmId: authorizedMatch.psmId, status },
    })

    const statusMessages: Record<'active' | 'paused' | 'ended', string> = {
      active: 'reactivado',
      paused: 'pausado',
      ended: 'finalizado'
    }

    return NextResponse.json({
      success: true,
      message: `Emparejamiento ${statusMessages[status as 'active' | 'paused' | 'ended']} exitosamente`,
      match: {
        id: updatedMatch.id,
        userId: updatedMatch.userId,
        psmId: updatedMatch.psmId,
        status: updatedMatch.status,
        matchedAt: updatedMatch.matchedAt,
        endedAt: updatedMatch.endedAt,
        reason: updatedMatch.reason
      }
    })

  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error updating match:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/matching/[matchId]
 * Deletes a match (admin only, for cleaning test data)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const denied = await guardAdmin(request)
    if (denied) return denied

    const { matchId } = await params

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        sessions: {
          select: { id: true }
        }
      }
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Emparejamiento no encontrado' },
        { status: 404 }
      )
    }

    // Delete associated sessions first (if any)
    if (match.sessions.length > 0) {
      await prisma.session.deleteMany({
        where: { matchId: matchId }
      })
    }

    // Delete the match
    await prisma.match.delete({
      where: { id: matchId }
    })

    return NextResponse.json({
      success: true,
      message: 'Emparejamiento eliminado exitosamente'
    })

  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error deleting match:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

