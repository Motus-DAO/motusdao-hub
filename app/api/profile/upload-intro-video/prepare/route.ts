import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSignedPsmIntroVideoUpload } from '@/lib/storage'
import { mapPsmIntroVideoUploadError } from '@/lib/storage-intro-video'
import { resolveUploadActor } from '@/lib/storage-auth'
import { handleAuthError } from '@/lib/auth/session'

const prepareSchema = z.object({
  eoaAddress: z.string().optional(),
  userId: z.string().optional(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  mimeType: z.string().default(''),
  head: z.array(z.number().int().min(0).max(255)).min(4).max(32),
})

export async function POST(request: NextRequest) {
  try {
    const body = prepareSchema.parse(await request.json())
    const actor = await resolveUploadActor(request, body.eoaAddress, body.userId)
    const head = Uint8Array.from(body.head)

    const upload = await createSignedPsmIntroVideoUpload({
      ownerKey: actor.ownerKey,
      file: {
        name: body.fileName,
        type: body.mimeType,
        size: body.fileSize,
      },
      head,
    })

    return NextResponse.json({
      storagePath: upload.storagePath,
      signedUrl: upload.signedUrl,
      token: upload.token,
      contentType: upload.contentType,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos de archivo inválidos' }, { status: 400 })
    }

    console.error('Error preparing intro video upload:', error)
    const mapped = mapPsmIntroVideoUploadError(error)
    return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  }
}
