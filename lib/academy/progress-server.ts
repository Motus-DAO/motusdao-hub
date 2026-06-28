import { prisma } from '@/lib/prisma'

export type EnrollmentProgressSnapshot = {
  progress: number
  completed: boolean
  completedLessonIds: string[]
  totalPublishedLessons: number
  completedCount: number
}

export async function countPublishedLessonsForCourse(courseId: string): Promise<number> {
  return prisma.lesson.count({
    where: {
      isPublished: true,
      module: { courseId },
    },
  })
}

export async function getCompletedLessonIdsForCourse(
  userId: string,
  courseId: string
): Promise<string[]> {
  const rows = await prisma.lessonProgress.findMany({
    where: {
      userId,
      completed: true,
      lesson: {
        isPublished: true,
        module: { courseId },
      },
    },
    select: { lessonId: true },
  })

  return rows.map((row) => row.lessonId)
}

export async function buildEnrollmentProgressSnapshot(
  userId: string,
  courseId: string
): Promise<EnrollmentProgressSnapshot> {
  const [totalPublishedLessons, completedLessonIds] = await Promise.all([
    countPublishedLessonsForCourse(courseId),
    getCompletedLessonIdsForCourse(userId, courseId),
  ])

  const completedCount = completedLessonIds.length
  const progress =
    totalPublishedLessons <= 0 ? 0 : Math.round((completedCount / totalPublishedLessons) * 100)
  const completed = totalPublishedLessons > 0 && progress >= 100

  return {
    progress,
    completed,
    completedLessonIds,
    totalPublishedLessons,
    completedCount,
  }
}

export async function syncEnrollmentProgress(enrollmentId: string): Promise<EnrollmentProgressSnapshot & { enrollmentId: string }> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, userId: true, courseId: true },
  })

  if (!enrollment) {
    throw new Error('ENROLLMENT_NOT_FOUND')
  }

  const snapshot = await buildEnrollmentProgressSnapshot(enrollment.userId, enrollment.courseId)

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progress: snapshot.progress,
      completed: snapshot.completed,
      updatedAt: new Date(),
    },
  })

  return { enrollmentId: enrollment.id, ...snapshot }
}

export async function markLessonCompleteForUser(params: {
  userId: string
  lessonId: string
}): Promise<{
  lesson: { id: string; courseId: string }
  enrollment: { id: string; progress: number; completed: boolean }
  snapshot: EnrollmentProgressSnapshot
}> {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: params.lessonId,
      isPublished: true,
      module: { course: { isPublished: true } },
    },
    select: {
      id: true,
      module: { select: { courseId: true } },
    },
  })

  if (!lesson?.module) {
    throw new Error('LESSON_NOT_FOUND')
  }

  const courseId = lesson.module.courseId

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: params.userId,
        courseId,
      },
    },
    select: { id: true },
  })

  if (!enrollment) {
    throw new Error('NOT_ENROLLED')
  }

  const now = new Date()

  await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: params.userId,
        lessonId: params.lessonId,
      },
    },
    update: {
      completed: true,
      completedAt: now,
      enrollmentId: enrollment.id,
      updatedAt: now,
    },
    create: {
      userId: params.userId,
      lessonId: params.lessonId,
      enrollmentId: enrollment.id,
      completed: true,
      completedAt: now,
    },
  })

  const snapshot = await syncEnrollmentProgress(enrollment.id)

  return {
    lesson: { id: lesson.id, courseId },
    enrollment: {
      id: enrollment.id,
      progress: snapshot.progress,
      completed: snapshot.completed,
    },
    snapshot,
  }
}
