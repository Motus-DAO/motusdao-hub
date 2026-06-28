import { NextRequest, NextResponse } from 'next/server'
import { requireSession, handleAuthError } from '@/lib/auth/session'
import { assertAuthenticatedUser } from '@/lib/auth/guards'
import { markLessonCompleteForUser } from '@/lib/academy/progress-server'

type RouteParams = { params: Promise<{ lessonId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { lessonId } = await params
    const session = await requireSession(request)
    const userId = assertAuthenticatedUser(session)

    const result = await markLessonCompleteForUser({ userId, lessonId })

    return NextResponse.json({
      success: true,
      lessonId: result.lesson.id,
      courseId: result.lesson.courseId,
      enrollment: result.enrollment,
      completedLessonIds: result.snapshot.completedLessonIds,
      progress: result.snapshot.progress,
      completed: result.snapshot.completed,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof Error) {
      if (error.message === 'LESSON_NOT_FOUND') {
        return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })
      }
      if (error.message === 'NOT_ENROLLED') {
        return NextResponse.json({ error: 'Debes estar inscrito en el curso' }, { status: 403 })
      }
    }

    console.error('Error marking lesson complete:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
