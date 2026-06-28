import type { PublicCourse } from '@/lib/academy/public-course'

const DEFAULT_TTL_MS = 5 * 60 * 1000

let cachedCourses: PublicCourse[] | null = null
let cachedAt = 0

export function getCachedPublishedCourses(): PublicCourse[] | null {
  return cachedCourses
}

export function isCoursesCacheFresh(ttlMs = DEFAULT_TTL_MS): boolean {
  return cachedCourses !== null && Date.now() - cachedAt < ttlMs
}

export function setCachedPublishedCourses(courses: PublicCourse[]): void {
  cachedCourses = courses
  cachedAt = Date.now()
}

export function upsertCachedCourse(course: PublicCourse): void {
  if (!cachedCourses) {
    cachedCourses = [course]
    cachedAt = Date.now()
    return
  }

  const index = cachedCourses.findIndex((item) => item.id === course.id || item.slug === course.slug)
  if (index === -1) {
    cachedCourses = [...cachedCourses, course]
  } else {
    cachedCourses = cachedCourses.map((item, itemIndex) => (itemIndex === index ? course : item))
  }
  cachedAt = Date.now()
}

export function findCachedCourseBySlug(slug: string): PublicCourse | null {
  if (!cachedCourses || !slug) return null
  return cachedCourses.find((course) => course.slug === slug) ?? null
}

export function invalidatePublishedCoursesCache(): void {
  cachedCourses = null
  cachedAt = 0
}
