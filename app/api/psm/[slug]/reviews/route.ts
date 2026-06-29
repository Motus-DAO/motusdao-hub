import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import { findPsmUserIdBySlug } from '@/lib/psm/lookup'
import { computeReputationSummary } from '@/lib/psm/reputation'
import { asStringArray } from '@/lib/prisma-json'

type RouteParams = { params: Promise<{ slug: string }> }

/**
 * GET /api/psm/[slug]/reviews
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const psmId = await findPsmUserIdBySlug(slug)

    if (!psmId) {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }

    const [reviews, psmProfile, agg] = await Promise.all([
      prisma.review.findMany({
        where: { psmId, status: 'published', courseId: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          rating: true,
          comment: true,
          isAnonymous: true,
          displayName: true,
          issueTags: true,
          createdAt: true,
        },
      }),
      prisma.pSMProfile.findUnique({
        where: { userId: psmId },
        select: { patientCount: true, completedSessionsCount: true },
      }),
      prisma.review.aggregate({
        where: { psmId, status: 'published', courseId: null },
        _count: { id: true },
        _sum: { rating: true },
      }),
    ])

    const reviewCount = agg._count.id
    const reputation = computeReputationSummary({
      reviewCount,
      patientCount: psmProfile?.patientCount ?? 0,
      completedSessions: psmProfile?.completedSessionsCount ?? 0,
      ratingSum: agg._sum.rating ?? 0,
    })

    return NextResponse.json({
      success: true,
      reputation,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        authorLabel: r.isAnonymous ? 'Paciente anónimo' : r.displayName || 'Paciente',
        issueTags: asStringArray(r.issueTags),
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

const reviewSchema = z.object({
  userId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  isAnonymous: z.boolean(),
  displayName: z.string().max(80).optional(),
  issueTags: z.array(z.string()).optional(),
})

/**
 * POST /api/psm/[slug]/reviews
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const body = reviewSchema.parse(await request.json())
    await requireSelfOrAdmin(request, body.userId)

    if (!body.isAnonymous && !body.displayName?.trim()) {
      return NextResponse.json(
        { error: 'Indica un nombre para mostrar o elige publicar de forma anónima' },
        { status: 400 }
      )
    }

    const psmId = await findPsmUserIdBySlug(slug)
    if (!psmId) {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }

    const completedSession = await prisma.session.findFirst({
      where: {
        userId: body.userId,
        psmId,
        status: 'completed',
      },
    })

    if (!completedSession) {
      return NextResponse.json(
        { error: 'Solo puedes opinar después de completar al menos una sesión' },
        { status: 403 }
      )
    }

    const existing = await prisma.review.findFirst({
      where: { authorId: body.userId, psmId },
    })

    if (existing) {
      const updated = await prisma.review.update({
        where: { id: existing.id },
        data: {
          rating: body.rating,
          comment: body.comment,
          isAnonymous: body.isAnonymous,
          displayName: body.isAnonymous ? null : body.displayName?.trim(),
          issueTags: body.issueTags ?? [],
          status: 'published',
          sessionId: completedSession.id,
        },
      })
      return NextResponse.json({ success: true, reviewId: updated.id })
    }

    const review = await prisma.review.create({
      data: {
        authorId: body.userId,
        psmId,
        sessionId: completedSession.id,
        rating: body.rating,
        comment: body.comment,
        isAnonymous: body.isAnonymous,
        displayName: body.isAnonymous ? null : body.displayName?.trim(),
        issueTags: body.issueTags ?? [],
        status: 'published',
      },
    })

    return NextResponse.json({ success: true, reviewId: review.id }, { status: 201 })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Opinión inválida', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating review:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
