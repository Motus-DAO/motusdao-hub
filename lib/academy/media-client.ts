import { authFetch } from '@/lib/auth/client'
import type { PdfResource } from '@/lib/academy/media'

async function parseUploadResponse(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Error al subir el archivo')
  }
  return body
}

export async function uploadLessonVideo(lessonId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await authFetch(`/api/admin/lessons/${encodeURIComponent(lessonId)}/upload-video`, {
    method: 'POST',
    body: formData,
  })

  const body = await parseUploadResponse(response)
  return body as { videoUrl: string; storagePath: string }
}

export async function uploadLessonPdf(lessonId: string, file: File, name?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (name) formData.append('name', name)

  const response = await authFetch(`/api/admin/lessons/${encodeURIComponent(lessonId)}/upload-pdf`, {
    method: 'POST',
    body: formData,
  })

  const body = await parseUploadResponse(response)
  return body as { pdfResources: PdfResource[] }
}

export async function deleteLessonPdf(lessonId: string, resourceId: string) {
  const response = await authFetch(
    `/api/admin/lessons/${encodeURIComponent(lessonId)}/pdf/${encodeURIComponent(resourceId)}`,
    { method: 'DELETE' }
  )

  const body = await parseUploadResponse(response)
  return body as { pdfResources: PdfResource[] }
}

export async function removeLessonVideo(lessonId: string) {
  const response = await authFetch(
    `/api/admin/lessons/${encodeURIComponent(lessonId)}/upload-video`,
    { method: 'DELETE' }
  )

  await parseUploadResponse(response)
}

export async function uploadCourseCover(courseId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await authFetch(
    `/api/admin/courses/${encodeURIComponent(courseId)}/upload-cover`,
    {
      method: 'POST',
      body: formData,
    }
  )

  const body = await parseUploadResponse(response)
  return body as { imageUrl: string; storagePath: string }
}

export async function removeCourseCover(courseId: string) {
  const response = await authFetch(
    `/api/admin/courses/${encodeURIComponent(courseId)}/upload-cover`,
    { method: 'DELETE' }
  )

  await parseUploadResponse(response)
}

export async function fetchLessonMediaUrl(lessonId: string, storagePath: string): Promise<string> {
  const params = new URLSearchParams({ storagePath })
  const response = await authFetch(
    `/api/academy/lessons/${encodeURIComponent(lessonId)}/media-url?${params.toString()}`
  )
  const body = await response.json().catch(() => ({}))

  if (!response.ok || !body.signedUrl) {
    throw new Error(body.error || 'No se pudo abrir el archivo')
  }

  return body.signedUrl as string
}
