import { NextRequest, NextResponse } from 'next/server'
import { mapPsmIntroVideoUploadError } from '@/lib/storage-intro-video'
import { handleAuthError } from '@/lib/auth/session'

/** Legacy multipart upload — Vercel body limits block most videos. Use prepare + direct PUT instead. */
export async function POST(request: NextRequest) {
  try {
    await request.formData()
    return NextResponse.json(
      {
        error:
          'La subida directa por el servidor ya no está disponible para videos grandes. Actualiza la página e intenta de nuevo; el navegador subirá el archivo directamente al almacenamiento seguro.',
      },
      { status: 410 }
    )
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    const mapped = mapPsmIntroVideoUploadError(error)
    return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  }
}
