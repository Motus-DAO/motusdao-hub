import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/session'
import { handleAuthError } from '@/lib/auth/session'
import { recordClinicalAccess } from '@/lib/clinical-audit'

const schema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
})

type RouteParams = { params: Promise<{ psmId: string }> }

/**
 * PATCH /api/admin/psm/[psmId]/intro-video
 * Approve or reject PSM intro video for public directory visibility.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request)
    const { psmId } = await params
    const { action, notes } = schema.parse(await request.json())

    const psm = await prisma.pSMProfile.findUnique({
      where: { userId: psmId },
    })

    if (!psm) {
      return NextResponse.json({ error: 'PSM no encontrado' }, { status: 404 })
    }

    if (!psm.introVideoStoragePath && !psm.introVideoUrl) {
      return NextResponse.json({ error: 'No hay video de presentación' }, { status: 400 })
    }

    const updated = await prisma.pSMProfile.update({
      where: { userId: psmId },
      data:
        action === 'approve'
          ? {
              introVideoApproved: true,
              introVideoApprovedAt: new Date(),
              adminReviewNotes: notes?.trim() || psm.adminReviewNotes,
            }
          : {
              introVideoApproved: false,
              introVideoApprovedAt: null,
              adminReviewNotes: notes?.trim() || 'Video de presentación rechazado',
            },
    })

    await recordClinicalAccess({
      request,
      actorUserId: admin.userId,
      targetUserId: psmId,
      action: 'update',
      resource: 'psm_profile',
      resourceId: updated.id,
      reason: `intro_video_${action}`,
    })

    return NextResponse.json({ success: true, psm: updated })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    console.error('Error updating intro video:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
