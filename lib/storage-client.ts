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

  const response = await fetch('/api/profile/upload-avatar', {
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

  const response = await fetch('/api/profile/upload-document', {
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
