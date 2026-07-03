import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth/admin-route'
import { getSessionFromRequest } from '@/lib/auth/session'
import { storagePathBelongsToLesson } from '@/lib/academy/media'
import {
  canAccessLessonContent,
} from '@/lib/academy/enrollment-access'

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
          course: {
            select: {
              isFree: true,
              priceAmount: true,
            },
          },
        },
      },
    },
  })

  if (!lesson?.module?.courseId) return null

  const course = lesson.module.course
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
    select: {
      purchasedAt: true,
      orderItems: { include: { order: { select: { status: true } } } },
    },
  })

  const allowed = canAccessLessonContent(course, lesson, enrollment)

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
