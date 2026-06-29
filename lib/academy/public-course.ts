import {
  setCachedPublishedCourses,
  upsertCachedCourse,
  isCoursesCacheFresh,
  getCachedPublishedCourses,
  findCachedCourseBySlug,
} from '@/lib/academy/courses-cache'
import { getCachedUserEnrollments, setCachedUserEnrollments } from '@/lib/academy/enrollments-cache'
import type { PdfResource } from '@/lib/academy/media'

export type PublicLesson = {
  id: string
  title: string
  slug: string
  summary: string | null
  duration: number | null
  order: number
  isPublished: boolean
  isFreePreview: boolean
}

export type PublicModule = {
  id: string
  title: string
  summary: string | null
  order: number
  lessons: PublicLesson[]
}

export type PublicCourse = {
  id: string
  title: string
  slug: string
  summary: string
  description: string | null
  imageUrl: string | null
  isPublished: boolean
  category: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  instructor: string | null
  instructorBio: string | null
  instructorTitle: string | null
  learningOutcomes: unknown
  rating: number | null
  reviewCount: number | null
  priceAmount: string | number | null
  priceCurrency: string
  isFree: boolean
  modules: PublicModule[]
}

export async function fetchPublishedCourses(
  signal?: AbortSignal,
  options?: { force?: boolean }
): Promise<PublicCourse[]> {
  if (!options?.force && isCoursesCacheFresh()) {
    return getCachedPublishedCourses() ?? []
  }

  const response = await fetch('/api/courses', {
    cache: 'no-store',
    signal,
  })
  if (!response.ok) {
    throw new Error('No se pudieron cargar los cursos')
  }

  const body = (await response.json()) as { courses?: PublicCourse[] }
  const courses = Array.isArray(body.courses) ? body.courses : []
  setCachedPublishedCourses(courses)
  return courses
}

export async function fetchPublishedCourseBySlug(
  slug: string,
  signal?: AbortSignal
): Promise<PublicCourse | null> {
  const response = await fetch(`/api/academy/courses/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
    signal,
  })

  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error('No se pudo cargar el curso')
  }

  const body = (await response.json()) as { course?: PublicCourse }
  const course = body.course ?? null
  if (course) upsertCachedCourse(course)
  return course
}

export async function ensurePublishedCourse(
  slug: string,
  signal?: AbortSignal
): Promise<PublicCourse | null> {
  const cached = findCachedCourseBySlug(slug)
  if (cached && isCoursesCacheFresh()) return cached
  return fetchPublishedCourseBySlug(slug, signal)
}

export function courseLessonCount(course: PublicCourse): number {
  return course.modules.reduce((total, module) => total + module.lessons.length, 0)
}

export function courseDuration(course: PublicCourse): number {
  return course.modules.reduce(
    (total, module) =>
      total + module.lessons.reduce((moduleTotal, lesson) => moduleTotal + (lesson.duration || 0), 0),
    0
  )
}

export function courseLearningOutcomes(course: PublicCourse): string[] {
  if (!Array.isArray(course.learningOutcomes)) return []
  return course.learningOutcomes.filter((outcome): outcome is string => typeof outcome === 'string')
}

export type EnrollmentSummary = {
  id: string
  userId: string
  courseId: string
  progress: number
  completed: boolean
  paid?: boolean
  purchasedAt?: string | null
}

export type GatedLessonResponse = {
  lesson: {
    id: string
    title: string
    slug: string
    summary: string | null
    duration: number | null
    order: number
    isFreePreview: boolean
    videoUrl: string | null
    pdfResources?: PdfResource[]
    contentMDX?: string | null
    moduleId: string | null
  }
  course: {
    id: string
    title: string
    slug: string
  }
  access: {
    allowed: boolean
    enrolled: boolean
    requiresEnrollment: boolean
  }
  enrollment?: EnrollmentSummary | null
}

export function firstLessonSlug(course: PublicCourse): string | null {
  for (const courseModule of course.modules) {
    const lesson = courseModule.lessons[0]
    if (lesson) return lesson.slug
  }
  return null
}

export function getOrderedLessons(course: PublicCourse): PublicLesson[] {
  return course.modules.flatMap((courseModule) => courseModule.lessons)
}

export function getNextLesson(course: PublicCourse, currentLessonSlug: string): PublicLesson | null {
  const lessons = getOrderedLessons(course)
  const index = lessons.findIndex((lesson) => lesson.slug === currentLessonSlug)
  if (index === -1 || index >= lessons.length - 1) return null
  return lessons[index + 1]
}

export function getFirstIncompleteLessonSlug(
  course: PublicCourse,
  completedLessonIds: Iterable<string>
): string | null {
  const completed = new Set(completedLessonIds)
  for (const lesson of getOrderedLessons(course)) {
    if (!completed.has(lesson.id)) return lesson.slug
  }
  return null
}

export function findLessonInCourse(course: PublicCourse, lessonSlug: string) {
  for (const courseModule of course.modules) {
    const lesson = courseModule.lessons.find((item) => item.slug === lessonSlug)
    if (lesson) return { module: courseModule, lesson }
  }
  return null
}

export async function fetchUserEnrollments(
  userId: string,
  signal?: AbortSignal,
  options?: { force?: boolean }
): Promise<EnrollmentSummary[]> {
  if (!options?.force) {
    const cached = getCachedUserEnrollments(userId)
    if (cached) return cached
  }

  const response = await fetch(`/api/enrollments?userId=${encodeURIComponent(userId)}`, {
    cache: 'no-store',
    credentials: 'include',
    signal,
  })
  if (!response.ok) {
    throw new Error('No se pudieron cargar las inscripciones')
  }

  const body = (await response.json()) as {
    enrollments?: Array<{
      id: string
      userId: string
      courseId: string
      progress: number
      completed: boolean
      purchasedAt?: string | null
      paid?: boolean
      orderItems?: Array<{ order?: { status?: string } | null }>
    }>
  }
  const enrollments = (Array.isArray(body.enrollments) ? body.enrollments : []).map((item) => ({
    id: item.id,
    userId: item.userId,
    courseId: item.courseId,
    progress: item.progress,
    completed: item.completed,
    purchasedAt: item.purchasedAt ?? null,
    paid:
      item.paid === true ||
      (Array.isArray(item.orderItems) &&
        item.orderItems.some((orderItem) => orderItem.order?.status === 'paid')),
  }))
  setCachedUserEnrollments(userId, enrollments)
  return enrollments
}

export async function fetchGatedLesson(
  courseSlug: string,
  lessonSlug: string,
  signal?: AbortSignal
): Promise<GatedLessonResponse> {
  const response = await fetch(
    `/api/academy/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}`,
    { cache: 'no-store', credentials: 'include', signal }
  )

  if (response.status === 404) {
    throw new Error('NOT_FOUND')
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || 'No se pudo cargar la lección')
  }

  return (await response.json()) as GatedLessonResponse
}
