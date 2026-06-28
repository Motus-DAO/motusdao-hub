import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  assertStoragePathForLesson,
  resolveLessonMediaAccess,
} from '@/lib/academy/media-access'
import { createSignedAcademyMediaUrl } from '@/lib/storage'

type RouteContext = {
  params: Promise<{ lessonId: string }>
}

const querySchema = z.object({
  storagePath: z.string().min(1),
})

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { lessonId } = await params
    const { searchParams } = new URL(request.url)
    const { storagePath } = querySchema.parse({
      storagePath: searchParams.get('storagePath'),
    })

    const access = await resolveLessonMediaAccess(request, lessonId)
    if (!access) {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })
    }

    if (!access.allowed) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    assertStoragePathForLesson(storagePath, access.courseId, access.lessonId)

    const signedUrl = await createSignedAcademyMediaUrl(storagePath)

    return NextResponse.json({
      success: true,
      signedUrl,
      expiresIn: 3600,
    })
  } catch (error) {
    console.error('Error creating lesson media URL:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    const status =
      message.includes('does not belong') || message.includes('No autorizado')
        ? 403
        : message.includes('not found') || message.includes('no encontrada')
          ? 404
          : 500

    return NextResponse.json({ error: message }, { status })
  }
}
