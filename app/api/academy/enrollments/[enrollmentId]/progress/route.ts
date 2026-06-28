import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import { buildEnrollmentProgressSnapshot } from '@/lib/academy/progress-server'

type RouteParams = { params: Promise<{ enrollmentId: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { enrollmentId } = await params

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        userId: true,
        courseId: true,
        progress: true,
        completed: true,
      },
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
    }

    await requireSelfOrAdmin(request, enrollment.userId)

    const snapshot = await buildEnrollmentProgressSnapshot(enrollment.userId, enrollment.courseId)

    if (snapshot.progress !== enrollment.progress || snapshot.completed !== enrollment.completed) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          progress: snapshot.progress,
          completed: snapshot.completed,
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      enrollmentId: enrollment.id,
      courseId: enrollment.courseId,
      completedLessonIds: snapshot.completedLessonIds,
      progress: snapshot.progress,
      completed: snapshot.completed,
      totalPublishedLessons: snapshot.totalPublishedLessons,
      completedCount: snapshot.completedCount,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching lesson progress:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
