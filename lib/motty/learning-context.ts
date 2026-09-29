import { hasActiveEnrollmentAccess } from '@/lib/academy/enrollment-access'
import {
  isPraxisCatalogSlug,
  PRAXIS_BLOCK_SLUG,
} from '@/lib/academy/praxis-catalog'
import {
  resolveRouteBlockSlug,
  ROUTE_BLOCK_SLUG_ORDER,
} from '@/lib/academy/route-blocks'
import { PUBLIC_KNOWLEDGE_NAMESPACES } from '@/lib/motty/namespaces'
import { prisma } from '@/lib/prisma'

export type MottyKnowledgeScope = (typeof PUBLIC_KNOWLEDGE_NAMESPACES)[number]

export type LearningCourseRow = {
  enrollmentId: string
  courseId: string
  slug: string
  title: string
  progress: number
  completed: boolean
  hasAccess: boolean
  /** Canonical route block slug when applicable; praxis catalog courses map to 03-praxis. */
  routeBlockSlug: string | null
}

export type LearningLastActivity = {
  at: string
  lessonSlug: string
  lessonTitle: string
  courseSlug: string
  courseTitle: string
}

export type UserLearningContext = {
  userId: string
  courses: LearningCourseRow[]
  accessibleCourses: LearningCourseRow[]
  /** Furthest incomplete route block with access, or null if none. */
  currentRouteStage: string | null
  lastActivity: LearningLastActivity | null
  /**
   * Motty MCP namespaces allowed for this user.
   * V1.1: always public brand/product — no premium corpus entitlement model yet.
   */
  allowedKnowledgeScopes: readonly MottyKnowledgeScope[]
}

/**
 * Map a course slug to a route-block slug for stage inference.
 * Reuses existing route-block + Praxis catalog helpers (no new product rules).
 */
export function inferRouteBlockSlug(courseSlug: string): string | null {
  const resolved = resolveRouteBlockSlug(courseSlug)
  if ((ROUTE_BLOCK_SLUG_ORDER as readonly string[]).includes(resolved)) {
    return resolved
  }
  if (isPraxisCatalogSlug(courseSlug) || courseSlug === PRAXIS_BLOCK_SLUG) {
    return PRAXIS_BLOCK_SLUG
  }
  return null
}

export function deriveCurrentRouteStage(
  courses: readonly Pick<
    LearningCourseRow,
    'hasAccess' | 'completed' | 'routeBlockSlug' | 'progress'
  >[]
): string | null {
  const accessible = courses.filter((c) => c.hasAccess && c.routeBlockSlug)

  for (const block of ROUTE_BLOCK_SLUG_ORDER) {
    const inBlock = accessible.filter((c) => c.routeBlockSlug === block)
    if (!inBlock.length) continue
    const allDone = inBlock.every((c) => c.completed || c.progress >= 100)
    if (!allDone) return block
  }

  // All enrolled route blocks complete → furthest accessed block, or null
  for (let i = ROUTE_BLOCK_SLUG_ORDER.length - 1; i >= 0; i -= 1) {
    const block = ROUTE_BLOCK_SLUG_ORDER[i]
    if (accessible.some((c) => c.routeBlockSlug === block)) return block
  }

  return null
}

export function resolveAllowedKnowledgeScopes(
  _context: Pick<UserLearningContext, 'accessibleCourses'>
): readonly MottyKnowledgeScope[] {
  // Premium lesson/corpus namespaces are NOT granted here: no Motty↔enrollment
  // entitlement mapping exists yet. Keep retrieval on public brand/product only.
  return PUBLIC_KNOWLEDGE_NAMESPACES
}

export function assertLearningContextUser(
  context: UserLearningContext,
  userId: string
): void {
  if (context.userId !== userId) {
    throw new Error('learning_context_user_mismatch')
  }
  for (const course of context.courses) {
    if (!course.enrollmentId || !course.courseId) {
      throw new Error('learning_context_invalid_row')
    }
  }
}

/** Load structured Academy context for Motty. Always scoped to `userId` server-side. */
export async function loadUserLearningContext(
  userId: string
): Promise<UserLearningContext> {
  if (!userId) {
    throw new Error('userId_required')
  }

  const [enrollments, lastProgress] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        courseId: true,
        progress: true,
        completed: true,
        purchasedAt: true,
        accessExpiresAt: true,
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            isFree: true,
            priceAmount: true,
            billingInterval: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.lessonProgress.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        updatedAt: true,
        lesson: {
          select: {
            slug: true,
            title: true,
            module: {
              select: {
                course: { select: { slug: true, title: true } },
              },
            },
          },
        },
      },
    }),
  ])

  // Defense in depth: never surface another user's rows.
  const own = enrollments.filter((row) => row.userId === userId)

  const courses: LearningCourseRow[] = own.map((row) => ({
    enrollmentId: row.id,
    courseId: row.courseId,
    slug: row.course.slug,
    title: row.course.title,
    progress: row.progress,
    completed: row.completed,
    hasAccess: hasActiveEnrollmentAccess(row, row.course),
    routeBlockSlug: inferRouteBlockSlug(row.course.slug),
  }))

  const accessibleCourses = courses.filter((c) => c.hasAccess)
  const currentRouteStage = deriveCurrentRouteStage(courses)

  const course = lastProgress?.lesson.module?.course
  const lastActivity: LearningLastActivity | null =
    lastProgress && course
      ? {
          at: lastProgress.updatedAt.toISOString(),
          lessonSlug: lastProgress.lesson.slug,
          lessonTitle: lastProgress.lesson.title,
          courseSlug: course.slug,
          courseTitle: course.title,
        }
      : null

  const context: UserLearningContext = {
    userId,
    courses,
    accessibleCourses,
    currentRouteStage,
    lastActivity,
    allowedKnowledgeScopes: resolveAllowedKnowledgeScopes({ accessibleCourses }),
  }

  assertLearningContextUser(context, userId)
  return context
}

export function formatLearningContextForPrompt(
  context: UserLearningContext
): string {
  assertLearningContextUser(context, context.userId)

  const lines: string[] = [
    '## Authenticated learner context (server-derived; do not invent beyond this)',
    `userId: ${context.userId}`,
    `currentRouteStage: ${context.currentRouteStage ?? 'none'}`,
    `allowedKnowledgeScopes: ${context.allowedKnowledgeScopes.join(', ')}`,
  ]

  if (!context.accessibleCourses.length) {
    lines.push('accessibleCourses: none (no active Academy access detected)')
  } else {
    lines.push('accessibleCourses:')
    for (const course of context.accessibleCourses) {
      lines.push(
        `- /academia/${course.slug} · ${course.title} · progress ${course.progress}% · completed=${course.completed} · block=${course.routeBlockSlug ?? 'other'}`
      )
    }
  }

  if (context.courses.some((c) => !c.hasAccess)) {
    lines.push(
      'enrolledWithoutActiveAccess: ' +
        context.courses
          .filter((c) => !c.hasAccess)
          .map((c) => c.slug)
          .join(', ')
    )
  }

  if (context.lastActivity) {
    lines.push(
      `lastActivity: ${context.lastActivity.at} · ${context.lastActivity.courseTitle} (${context.lastActivity.courseSlug}) · lesson ${context.lastActivity.lessonTitle} (${context.lastActivity.lessonSlug})`
    )
  } else {
    lines.push('lastActivity: none')
  }

  lines.push(
    'Instructions: use this context to orient the professional. Recommend Hub paths they can open. Do not recite or invent premium lesson bodies. Do not claim knowledge scopes beyond allowedKnowledgeScopes.'
  )

  return lines.join('\n')
}
