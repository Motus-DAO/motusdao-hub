import { authFetch } from '@/lib/auth/client'

type UploadDocumentParams = {
  file: File
  documentType: 'cedula' | 'titulo'
  eoaAddress?: string
  userId?: string
}

type UploadAvatarParams = {
  file: File
  eoaAddress?: string
  userId?: string
}

async function parseUploadResponse(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      typeof body.error === 'string' ? body.error : 'Error al subir el archivo'
    )
  }
  return body
}

export async function uploadProfileAvatar(params: UploadAvatarParams) {
  const formData = new FormData()
  formData.append('file', params.file)
  if (params.userId) formData.append('userId', params.userId)
  if (params.eoaAddress) formData.append('eoaAddress', params.eoaAddress)

  const response = await authFetch('/api/profile/upload-avatar', {
    method: 'POST',
    body: formData,
  })

  return parseUploadResponse(response) as unknown as {
    avatarUrl: string
    storagePath: string
  }
}

export async function uploadProfessionalDocument(params: UploadDocumentParams) {
  const formData = new FormData()
  formData.append('file', params.file)
  formData.append('documentType', params.documentType)
  if (params.userId) formData.append('userId', params.userId)
  if (params.eoaAddress) formData.append('eoaAddress', params.eoaAddress)

  const response = await authFetch('/api/profile/upload-document', {
    method: 'POST',
    body: formData,
  })

  return parseUploadResponse(response) as unknown as {
    storagePath: string
    documentType: 'cedula' | 'titulo'
  }
}

export function getFileNameFromStoragePath(storagePath?: string): string | undefined {
  if (!storagePath) return undefined
  return storagePath.split('/').pop()
}

export async function fetchSignedDocumentUrl(
  storagePath: string,
  userId?: string
): Promise<string> {
  const params = new URLSearchParams({ storagePath })
  if (userId) params.set('userId', userId)

  const response = await authFetch(`/api/profile/document-url?${params.toString()}`)
  const body = await response.json().catch(() => ({}))

  if (!response.ok || !body.signedUrl) {
    throw new Error(body.error || 'No se pudo abrir el documento')
  }

  return body.signedUrl as string
}

type PrepareIntroVideoResponse = {
  storagePath: string
  signedUrl: string
  token: string
  contentType: string
}

export async function uploadPsmIntroVideoDirect(params: {
  file: File
  eoaAddress?: string
  userId?: string
}): Promise<{ storagePath: string; introVideoUrl: string }> {
  const head = new Uint8Array(await params.file.slice(0, 16).arrayBuffer())

  const prepareRes = await authFetch('/api/profile/upload-intro-video/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eoaAddress: params.eoaAddress,
      userId: params.userId,
      fileName: params.file.name,
      fileSize: params.file.size,
      mimeType: params.file.type,
      head: Array.from(head),
    }),
  })

  const prepareBody = (await prepareRes.json().catch(() => ({}))) as Partial<
    PrepareIntroVideoResponse & { error?: string }
  >

  if (!prepareRes.ok) {
    throw new Error(
      typeof prepareBody.error === 'string'
        ? prepareBody.error
        : 'No se pudo preparar la subida del video'
    )
  }

  if (!prepareBody.signedUrl || !prepareBody.storagePath || !prepareBody.contentType) {
    throw new Error('Respuesta incompleta al preparar la subida del video')
  }

  const putRes = await fetch(prepareBody.signedUrl, {
    method: 'PUT',
    body: params.file,
    headers: {
      'Content-Type': prepareBody.contentType,
      'x-upsert': 'true',
    },
  })

  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => '')
    if (putRes.status === 413 || /too large/i.test(detail)) {
      throw new Error(
        'El video es demasiado grande para el almacenamiento. Máximo 100 MB. Comprime el archivo o usa un enlace externo.'
      )
    }
    throw new Error(
      detail.trim() ||
        'No se pudo enviar el video al almacenamiento. Revisa tu conexión e intenta de nuevo.'
    )
  }

  const completeRes = await authFetch('/api/profile/upload-intro-video/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eoaAddress: params.eoaAddress,
      userId: params.userId,
      storagePath: prepareBody.storagePath,
    }),
  })

  const completeBody = await completeRes.json().catch(() => ({}))
  if (!completeRes.ok) {
    throw new Error(
      typeof completeBody.error === 'string'
        ? completeBody.error
        : 'El video se subió pero no pudimos registrarlo en tu perfil'
    )
  }

  return {
    storagePath: prepareBody.storagePath,
    introVideoUrl: completeBody.introVideoUrl as string,
  }
}
