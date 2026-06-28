import { authFetch } from '@/lib/auth/client'

const STORAGE_PREFIX = 'academy-lesson-progress'

export type LessonProgressResponse = {
  enrollmentId: string
  courseId: string
  completedLessonIds: string[]
  progress: number
  completed: boolean
  totalPublishedLessons: number
  completedCount: number
}

export type MarkLessonCompleteResponse = {
  success: boolean
  lessonId: string
  courseId: string
  enrollment: {
    id: string
    progress: number
    completed: boolean
  }
  completedLessonIds: string[]
  progress: number
  completed: boolean
}

function localStorageKey(userId: string, courseId: string): string {
  return `${STORAGE_PREFIX}:${userId}:${courseId}`
}

/** Read legacy slice-4 localStorage progress (migration only). */
export function readLegacyLocalProgress(userId: string, courseId: string): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(localStorageKey(userId, courseId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export function clearLegacyLocalProgress(userId: string, courseId: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(localStorageKey(userId, courseId))
}

export async function fetchLessonProgress(
  enrollmentId: string,
  signal?: AbortSignal
): Promise<LessonProgressResponse> {
  const response = await authFetch(`/api/academy/enrollments/${encodeURIComponent(enrollmentId)}/progress`, {
    cache: 'no-store',
    signal,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || 'No se pudo cargar el progreso')
  }

  return (await response.json()) as LessonProgressResponse
}

export async function markLessonCompleteApi(
  lessonId: string,
  signal?: AbortSignal
): Promise<MarkLessonCompleteResponse> {
  const response = await authFetch(`/api/academy/lessons/${encodeURIComponent(lessonId)}/complete`, {
    method: 'POST',
    cache: 'no-store',
    signal,
  })

  if (response.status === 403) {
    throw new Error('NOT_ENROLLED')
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || 'No se pudo marcar la lección como completada')
  }

  return (await response.json()) as MarkLessonCompleteResponse
}

/** One-time migration from slice-4 localStorage to server progress. */
export async function migrateLegacyLocalProgress(params: {
  userId: string
  courseId: string
  enrollmentId: string
  signal?: AbortSignal
}): Promise<LessonProgressResponse | null> {
  const legacyIds = readLegacyLocalProgress(params.userId, params.courseId)
  if (legacyIds.length === 0) return null

  for (const lessonId of legacyIds) {
    try {
      await markLessonCompleteApi(lessonId, params.signal)
    } catch {
      // Skip invalid or inaccessible legacy ids; continue migrating the rest.
    }
  }

  clearLegacyLocalProgress(params.userId, params.courseId)
  return fetchLessonProgress(params.enrollmentId, params.signal)
}
