import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { toStorageRef } from '@/lib/academy/media'
import { documentPathBelongsToOwner } from '@/lib/storage'
import { mapPsmIntroVideoUploadError } from '@/lib/storage-intro-video'
import { resolveUploadActor } from '@/lib/storage-auth'
import { handleAuthError } from '@/lib/auth/session'

const completeSchema = z.object({
  eoaAddress: z.string().optional(),
  userId: z.string().optional(),
  storagePath: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = completeSchema.parse(await request.json())
    const actor = await resolveUploadActor(request, body.eoaAddress, body.userId)

    if (!documentPathBelongsToOwner(body.storagePath, actor.ownerKey)) {
      return NextResponse.json({ error: 'Ruta de video no válida para tu cuenta' }, { status: 403 })
    }

    if (actor.userId) {
      await prisma.pSMProfile.updateMany({
        where: { userId: actor.userId },
        data: {
          introVideoStoragePath: body.storagePath,
          introVideoUrl: toStorageRef(body.storagePath),
          introVideoApproved: false,
          introVideoApprovedAt: null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      storagePath: body.storagePath,
      introVideoUrl: toStorageRef(body.storagePath),
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

    console.error('Error completing intro video upload:', error)
    const mapped = mapPsmIntroVideoUploadError(error)
    return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  }
}
