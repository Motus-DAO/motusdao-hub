import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  fromStorageRef,
  isStorageMediaRef,
  parsePdfResources,
  type PdfResource,
} from '@/lib/academy/media'
import { createSignedAcademyMediaUrl } from '@/lib/storage'
import {
  canAccessLessonContent,
  enrollmentHasPaidAccess,
} from '@/lib/academy/enrollment-access'

type RouteParams = { params: Promise<{ slug: string; lessonSlug: string }> }

async function resolveVideoUrlForClient(
  videoUrl: string | null,
  allowed: boolean
): Promise<string | null> {
  if (!videoUrl) return null
  if (!allowed && isStorageMediaRef(videoUrl)) return null
  if (isStorageMediaRef(videoUrl)) {
    try {
      const storagePath = fromStorageRef(videoUrl)
      return await createSignedAcademyMediaUrl(storagePath)
    } catch (error) {
      console.error('Failed to sign academy lesson video URL:', error)
      return null
    }
  }
  return videoUrl
}

function pdfResourcesForClient(
  pdfResources: unknown,
  allowed: boolean
): PdfResource[] | undefined {
  if (!allowed) return undefined
  const parsed = parsePdfResources(pdfResources)
  return parsed.length > 0 ? parsed : undefined
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug, lessonSlug } = await params

    const course = await prisma.course.findFirst({
      where: { slug, isPublished: true },
      select: {
        id: true,
        title: true,
        slug: true,
        isFree: true,
        priceAmount: true,
        priceCurrency: true,
        modules: {
          select: {
            id: true,
            lessons: {
              where: { slug: lessonSlug, isPublished: true },
              select: {
                id: true,
                title: true,
                slug: true,
                summary: true,
                duration: true,
                order: true,
                isFreePreview: true,
                videoUrl: true,
                pdfResources: true,
                contentMDX: true,
                moduleId: true,
              },
            },
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    const lesson = course.modules.flatMap((module) => module.lessons)[0]
    if (!lesson) {
      return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })
    }

    const session = await getSessionFromRequest(request)
    let enrolled = false
    let paid = false
    let enrollment = null

    if (session?.userId) {
      enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.userId,
            courseId: course.id,
          },
        },
        select: {
          id: true,
          userId: true,
          courseId: true,
          progress: true,
          completed: true,
          purchasedAt: true,
          orderItems: { include: { order: { select: { status: true } } } },
        },
      })
      enrolled = Boolean(enrollment)
      paid = enrollmentHasPaidAccess(course, enrollment)
    }

    const allowed = canAccessLessonContent(course, lesson, enrollment)
    const resolvedVideoUrl = await resolveVideoUrlForClient(lesson.videoUrl, allowed)
    const pdfResources = pdfResourcesForClient(lesson.pdfResources, allowed)

    return NextResponse.json({
      lesson: allowed
        ? {
            ...lesson,
            videoUrl: resolvedVideoUrl,
            pdfResources,
          }
        : {
            id: lesson.id,
            title: lesson.title,
            slug: lesson.slug,
            summary: lesson.summary,
            duration: lesson.duration,
            order: lesson.order,
            isFreePreview: lesson.isFreePreview,
            videoUrl: resolvedVideoUrl,
            moduleId: lesson.moduleId,
          },
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
      },
      access: {
        allowed,
        enrolled,
        paid,
        requiresEnrollment: !lesson.isFreePreview && !paid,
        requiresPayment: !paid && !course.isFree && Number(course.priceAmount || 0) > 0,
      },
      enrollment: paid && enrollment
        ? {
            id: enrollment.id,
            userId: enrollment.userId,
            courseId: enrollment.courseId,
            progress: enrollment.progress,
            completed: enrollment.completed,
            paid: true,
            purchasedAt: enrollment.purchasedAt?.toISOString() ?? null,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching gated lesson:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
