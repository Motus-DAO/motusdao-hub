import { NextRequest, NextResponse } from 'next/server'
import { lockCourseToSeed } from '@/lib/academy/lock-course-to-seed'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: Promise<{ courseId: string }>
}

/**
 * POST /api/admin/courses/[courseId]/lock-to-seed
 * Snapshot current DB course into prisma/data/locked (+ canonical seed when mapped).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { courseId } = await params
    const result = await lockCourseToSeed(prisma, courseId)

    if (!result.filesystemWritable) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'No se pudo escribir en disco (entorno sin filesystem writable, p.ej. Vercel). Usa export local o corre el admin en desarrollo.',
          result,
        },
        { status: 409 },
      )
    }

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    if (error instanceof Error && error.message === 'COURSE_NOT_FOUND') {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }
    console.error('Error locking course to seed:', error)
    return NextResponse.json({ error: 'No se pudo guardar el curso en seed' }, { status: 500 })
  }
}
