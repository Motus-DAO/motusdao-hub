import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth/admin-route'
import { getSessionFromRequest } from '@/lib/auth/session'
import { storagePathBelongsToLesson } from '@/lib/academy/media'

export type LessonMediaAccess = {
  lessonId: string
  courseId: string
  isFreePreview: boolean
  allowed: boolean
  isAdmin: boolean
}

export async function resolveLessonMediaAccess(
  request: NextRequest,
  lessonId: string
): Promise<LessonMediaAccess | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      isFreePreview: true,
      module: {
        select: {
          courseId: true,
        },
      },
    },
  })

  if (!lesson?.module?.courseId) return null

  const courseId = lesson.module.courseId
  const adminDenied = await guardAdmin(request)
  const isAdmin = !adminDenied

  if (isAdmin) {
    return {
      lessonId: lesson.id,
      courseId,
      isFreePreview: lesson.isFreePreview,
      allowed: true,
      isAdmin: true,
    }
  }

  const session = await getSessionFromRequest(request)
  if (!session?.userId) {
    return {
      lessonId: lesson.id,
      courseId,
      isFreePreview: lesson.isFreePreview,
      allowed: lesson.isFreePreview,
      isAdmin: false,
    }
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId,
      },
    },
    select: { id: true },
  })

  const enrolled = Boolean(enrollment)
  const allowed = lesson.isFreePreview || enrolled

  return {
    lessonId: lesson.id,
    courseId,
    isFreePreview: lesson.isFreePreview,
    allowed,
    isAdmin: false,
  }
}

export function assertStoragePathForLesson(
  storagePath: string,
  courseId: string,
  lessonId: string
): void {
  if (!storagePathBelongsToLesson(storagePath, courseId, lessonId)) {
    throw new Error('Storage path does not belong to this lesson')
  }
}
