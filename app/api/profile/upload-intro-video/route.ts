import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadPsmIntroVideo } from '@/lib/storage'
import { toStorageRef } from '@/lib/academy/media'
import { resolveUploadActor } from '@/lib/storage-auth'
import { handleAuthError } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null
    const eoaAddress = formData.get('eoaAddress') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const actor = await resolveUploadActor(request, eoaAddress, userId)
    const { storagePath } = await uploadPsmIntroVideo({
      file,
      ownerKey: actor.ownerKey,
    })

    if (actor.userId) {
      await prisma.pSMProfile.updateMany({
        where: { userId: actor.userId },
        data: {
          introVideoStoragePath: storagePath,
          introVideoUrl: toStorageRef(storagePath),
          introVideoApproved: false,
          introVideoApprovedAt: null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      storagePath,
      introVideoUrl: toStorageRef(storagePath),
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error uploading intro video:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al subir el video' },
      { status: 500 }
    )
  }
}
