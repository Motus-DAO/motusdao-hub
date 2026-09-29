import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assertLearningContextUser,
  deriveCurrentRouteStage,
  formatLearningContextForPrompt,
  inferRouteBlockSlug,
  resolveAllowedKnowledgeScopes,
  type LearningCourseRow,
  type UserLearningContext,
} from '@/lib/motty/learning-context'

function course(
  partial: Partial<LearningCourseRow> & Pick<LearningCourseRow, 'slug' | 'hasAccess'>
): LearningCourseRow {
  return {
    enrollmentId: partial.enrollmentId ?? `enr_${partial.slug}`,
    courseId: partial.courseId ?? `course_${partial.slug}`,
    slug: partial.slug,
    title: partial.title ?? partial.slug,
    progress: partial.progress ?? 0,
    completed: partial.completed ?? false,
    hasAccess: partial.hasAccess,
    routeBlockSlug:
      partial.routeBlockSlug !== undefined
        ? partial.routeBlockSlug
        : inferRouteBlockSlug(partial.slug),
  }
}

function contextFor(
  userId: string,
  courses: LearningCourseRow[]
): UserLearningContext {
  const accessibleCourses = courses.filter((c) => c.hasAccess)
  return {
    userId,
    courses,
    accessibleCourses,
    currentRouteStage: deriveCurrentRouteStage(courses),
    lastActivity: null,
    allowedKnowledgeScopes: resolveAllowedKnowledgeScopes({ accessibleCourses }),
  }
}

describe('Motty learning context derivation', () => {
  it('maps route and praxis catalog slugs to blocks', () => {
    assert.equal(inferRouteBlockSlug('01-genesis'), '01-genesis')
    assert.equal(inferRouteBlockSlug('02-fundamentos'), '02-fundamentos')
    assert.equal(inferRouteBlockSlug('escucha-clinica-patrones'), '03-praxis')
    assert.equal(inferRouteBlockSlug('04-validacion'), '04-validacion')
    assert.equal(inferRouteBlockSlug('random-workshop'), null)
  })

  it('derives current stage as first incomplete accessible block', () => {
    const stage = deriveCurrentRouteStage([
      course({ slug: '01-genesis', hasAccess: true, completed: true, progress: 100 }),
      course({ slug: '02-fundamentos', hasAccess: true, progress: 40 }),
    ])
    assert.equal(stage, '02-fundamentos')
  })

  it('keeps knowledge scopes on public brand/product even with paid access', () => {
    const ctx = contextFor('user_a', [
      course({ slug: '02-fundamentos', hasAccess: true, progress: 50 }),
    ])
    assert.deepEqual([...ctx.allowedKnowledgeScopes], ['brand', 'product'])
  })
})

describe('Motty learning context user isolation', () => {
  it('rejects context bound to a different userId', () => {
    const ctx = contextFor('user_a', [
      course({ slug: '01-genesis', hasAccess: true }),
    ])
    assert.throws(() => assertLearningContextUser(ctx, 'user_b'), /mismatch/)
  })

  it('formatted prompt for user_a never includes user_b identifiers', () => {
    const a = contextFor('user_a', [
      course({
        slug: '02-fundamentos',
        hasAccess: true,
        progress: 25,
        enrollmentId: 'enr_a',
        courseId: 'course_a',
      }),
    ])
    a.lastActivity = {
      at: '2026-01-01T00:00:00.000Z',
      lessonSlug: 'tu-encuadre-listo',
      lessonTitle: 'Encuadre',
      courseSlug: '02-fundamentos',
      courseTitle: 'Fundamentos',
    }

    const b = contextFor('user_b', [
      course({
        slug: 'escucha-clinica-patrones',
        hasAccess: true,
        enrollmentId: 'enr_b_secret',
        courseId: 'course_b_secret',
        title: 'SECRET_PRAXIS_FOR_B',
      }),
    ])

    const textA = formatLearningContextForPrompt(a)
    assert.match(textA, /userId: user_a/)
    assert.match(textA, /02-fundamentos/)
    assert.doesNotMatch(textA, /user_b/)
    assert.doesNotMatch(textA, /enr_b_secret/)
    assert.doesNotMatch(textA, /course_b_secret/)
    assert.doesNotMatch(textA, /SECRET_PRAXIS_FOR_B/)

    const textB = formatLearningContextForPrompt(b)
    assert.match(textB, /userId: user_b/)
    assert.doesNotMatch(textB, /user_a/)
    assert.doesNotMatch(textB, /enr_a/)
  })

  it('agent-loop refuses injected foreign learningContext', async () => {
    const { runHubMottyTurn } = await import('@/lib/motty/agent-loop')
    const foreign = contextFor('attacker', [
      course({ slug: '02-fundamentos', hasAccess: true, title: 'FOREIGN_FUNDAMENTOS' }),
    ])

    // No AI key → grounded fallback path; still must drop foreign context.
    const result = await runHubMottyTurn({
      session: {
        id: 'sess',
        userId: 'victim',
        locale: 'es',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      userMessage: 'hola',
      learningContext: foreign,
    })

    assert.equal(result.learningContext, null)
    assert.doesNotMatch(result.reply, /FOREIGN_FUNDAMENTOS/)
  })
})
