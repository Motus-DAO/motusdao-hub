import { z } from 'zod'

export const STORAGE_REF_PREFIX = 'storage:'

export const pdfResourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  storagePath: z.string().min(1),
  uploadedAt: z.string().datetime(),
})

export type PdfResource = z.infer<typeof pdfResourceSchema>

export function isStorageMediaRef(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith(STORAGE_REF_PREFIX)
}

export function toStorageRef(storagePath: string): string {
  return `${STORAGE_REF_PREFIX}${storagePath}`
}

export function fromStorageRef(value: string): string {
  if (!isStorageMediaRef(value)) {
    throw new Error('Invalid storage media reference')
  }
  return value.slice(STORAGE_REF_PREFIX.length)
}

export function parsePdfResources(value: unknown): PdfResource[] {
  if (!value) return []
  const parsed = z.array(pdfResourceSchema).safeParse(value)
  return parsed.success ? parsed.data : []
}

export function storagePathBelongsToLesson(storagePath: string, courseId: string, lessonId: string): boolean {
  const prefix = `${courseId}/${lessonId}/`
  return storagePath.startsWith(prefix)
}

export function isValidLessonVideoUrl(value: string): boolean {
  if (isStorageMediaRef(value)) {
    const path = fromStorageRef(value)
    return /^[^/]+\/[^/]+\/video\.(mp4|webm)$/.test(path)
  }
  return URL.canParse(value)
}
