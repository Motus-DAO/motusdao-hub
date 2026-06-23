import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth/admin-route'
import { handleAuthError, requireAdmin } from '@/lib/auth/session'
import { applyPsmVerificationTransition } from '@/lib/psm-verification'
import { recordClinicalAccess } from '@/lib/clinical-audit'

const verificationSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend', 'request_resubmission']),
  notes: z.string().optional(),
})

/**
 * PATCH /api/admin/psm/[psmId]
 * Transitions PSM verification status (admin only).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ psmId: string }> }
) {
  try {
    const admin = await requireAdmin(request)
    const { psmId } = await params
    const { action, notes } = verificationSchema.parse(await request.json())

    if ((action === 'reject' || action === 'suspend') && !notes?.trim()) {
      return NextResponse.json(
        { error: 'Las notas son obligatorias para rechazar o suspender' },
        { status: 400 }
      )
    }

    const result = await applyPsmVerificationTransition({
      psmUserId: psmId,
      action,
      adminUserId: admin.userId,
      notes,
    })

    await recordClinicalAccess({
      request,
      actorUserId: admin.userId,
      targetUserId: psmId,
      action: 'update',
      resource: 'psm_profile',
      resourceId: result.psm.id,
      reason: `psm_${action}`,
    })

    return NextResponse.json({
      success: true,
      user: result.user,
      psm: result.psm,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Acción de verificación inválida', details: error.errors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    const status = message.includes('no encontrado') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * DELETE /api/admin/psm/[psmId]
 * Deletes a PSM user and all related data (admin only, for cleaning test data)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ psmId: string }> }
) {
  try {
    const denied = await guardAdmin(request)
    if (denied) return denied

    const { psmId } = await params

    const psm = await prisma.user.findUnique({
      where: { id: psmId },
      include: {
        psmMatches: {
          select: { id: true }
        },
        sessionsAsPSM: {
          select: { id: true }
        }
      }
    })

    if (!psm) {
      return NextResponse.json(
        { error: 'Profesional no encontrado' },
        { status: 404 }
      )
    }

    // Verify it's actually a PSM
    if (psm.role !== 'psm') {
      return NextResponse.json(
        { error: 'El usuario especificado no es un profesional (PSM)' },
        { status: 400 }
      )
    }

    // Note: Since we've already verified the role is 'psm', 
    // we don't need to check for 'admin' as it's impossible at this point

    // Delete the PSM user (cascade will handle related data)
    // Prisma will automatically delete:
    // - Profile, PSMProfile
    // - Matches (as PSM)
    // - Sessions (as PSM)
    // - PaymentPreferences, PaymentLogs
    await prisma.user.delete({
      where: { id: psmId }
    })

    return NextResponse.json({
      success: true,
      message: 'Profesional eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error deleting PSM:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

