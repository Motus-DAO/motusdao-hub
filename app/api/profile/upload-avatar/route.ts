import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadAvatar } from '@/lib/storage'
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
    const { storagePath, publicUrl } = await uploadAvatar({
      file,
      ownerKey: actor.ownerKey,
    })

    if (actor.userId) {
      const profile = await prisma.profile.findUnique({
        where: { userId: actor.userId },
        select: { id: true },
      })

      if (profile) {
        await prisma.profile.update({
          where: { userId: actor.userId },
          data: {
            avatarUrl: publicUrl,
            avatarStoragePath: storagePath,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl: publicUrl,
      storagePath,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error uploading avatar:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status =
      message.includes('Not authorized') ||
      message.includes('does not match') ||
      message.includes('required')
        ? 403
        : message.includes('Invalid') || message.includes('too large')
          ? 400
          : 500

    return NextResponse.json({ error: message }, { status })
  }
}
