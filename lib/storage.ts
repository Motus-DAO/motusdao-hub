import { getAddress, isAddress } from 'viem'
import { getSupabaseAdmin } from './supabase-admin'

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  professionalDocuments: 'professional-documents',
  academyLessons: 'academy-lessons',
} as const

export type DocumentType = 'cedula' | 'titulo'

const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
const DOCUMENT_MIME_TYPES = [...AVATAR_MIME_TYPES, 'application/pdf'] as const
const ACADEMY_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const
const ACADEMY_PDF_MIME_TYPES = ['application/pdf'] as const

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024
const ACADEMY_VIDEO_MAX_BYTES = 100 * 1024 * 1024
const ACADEMY_PDF_MAX_BYTES = 10 * 1024 * 1024

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

export function normalizeWalletAddress(address: string): string {
  if (!isAddress(address)) {
    throw new Error('Invalid wallet address')
  }
  return getAddress(address).toLowerCase()
}

function getExtension(mimeType: string): string {
  const ext = MIME_TO_EXT[mimeType]
  if (!ext) throw new Error(`Unsupported mime type: ${mimeType}`)
  return ext
}

function validateFile(
  file: File,
  allowedTypes: readonly string[],
  maxBytes: number
): void {
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}`)
  }
  if (file.size > maxBytes) {
    throw new Error(`File too large. Maximum size is ${Math.round(maxBytes / (1024 * 1024))}MB`)
  }
}

export function getAvatarPublicUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKETS.avatars}/${storagePath}`
}

export async function uploadAvatar(params: {
  file: File
  ownerKey: string
}): Promise<{ storagePath: string; publicUrl: string }> {
  validateFile(params.file, AVATAR_MIME_TYPES, AVATAR_MAX_BYTES)

  const ownerKey = normalizeWalletAddress(params.ownerKey)
  const ext = getExtension(params.file.type)
  const storagePath = `${ownerKey}/avatar.${ext}`
  const buffer = Buffer.from(await params.file.arrayBuffer())

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.avatars)
    .upload(storagePath, buffer, {
      contentType: params.file.type,
      upsert: true,
    })

  if (error) throw new Error(error.message)

  return {
    storagePath,
    publicUrl: getAvatarPublicUrl(storagePath),
  }
}

export async function uploadProfessionalDocument(params: {
  file: File
  ownerKey: string
  documentType: DocumentType
}): Promise<{ storagePath: string }> {
  validateFile(params.file, DOCUMENT_MIME_TYPES, DOCUMENT_MAX_BYTES)

  const ownerKey = normalizeWalletAddress(params.ownerKey)
  const ext = getExtension(params.file.type)
  const storagePath = `${ownerKey}/${params.documentType}.${ext}`
  const buffer = Buffer.from(await params.file.arrayBuffer())

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.professionalDocuments)
    .upload(storagePath, buffer, {
      contentType: params.file.type,
      upsert: true,
    })

  if (error) throw new Error(error.message)

  return { storagePath }
}

export async function createSignedDocumentUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.professionalDocuments)
    .createSignedUrl(storagePath, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Failed to create signed URL')
  }

  return data.signedUrl
}

export function documentPathBelongsToOwner(
  storagePath: string,
  ownerKey: string
): boolean {
  const normalized = normalizeWalletAddress(ownerKey)
  return storagePath.toLowerCase().startsWith(`${normalized}/`)
}

export async function uploadAcademyVideo(params: {
  file: File
  courseId: string
  lessonId: string
}): Promise<{ storagePath: string }> {
  validateFile(params.file, ACADEMY_VIDEO_MIME_TYPES, ACADEMY_VIDEO_MAX_BYTES)

  const ext = getExtension(params.file.type)
  const storagePath = `${params.courseId}/${params.lessonId}/video.${ext}`
  const buffer = Buffer.from(await params.file.arrayBuffer())

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.academyLessons)
    .upload(storagePath, buffer, {
      contentType: params.file.type,
      upsert: true,
    })

  if (error) throw new Error(error.message)

  return { storagePath }
}

export async function uploadAcademyPdf(params: {
  file: File
  courseId: string
  lessonId: string
  resourceId: string
}): Promise<{ storagePath: string }> {
  validateFile(params.file, ACADEMY_PDF_MIME_TYPES, ACADEMY_PDF_MAX_BYTES)

  const storagePath = `${params.courseId}/${params.lessonId}/pdfs/${params.resourceId}.pdf`
  const buffer = Buffer.from(await params.file.arrayBuffer())

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.academyLessons)
    .upload(storagePath, buffer, {
      contentType: params.file.type,
      upsert: true,
    })

  if (error) throw new Error(error.message)

  return { storagePath }
}

export async function deleteAcademyMedia(storagePath: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(STORAGE_BUCKETS.academyLessons).remove([storagePath])
  if (error) throw new Error(error.message)
}

export async function createSignedAcademyMediaUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.academyLessons)
    .createSignedUrl(storagePath, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Failed to create signed URL')
  }

  return data.signedUrl
}
