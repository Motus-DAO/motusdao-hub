import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'

const enrollmentSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
  orderItemId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = enrollmentSchema.parse(await request.json())
    await requireSelfOrAdmin(request, body.userId)

    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: body.userId,
          courseId: body.courseId,
        },
      },
      update: {
        purchasedAt: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        userId: body.userId,
        courseId: body.courseId,
        progress: 0,
        completed: false,
        updatedAt: new Date(),
        purchasedAt: new Date(),
      },
    })

    if (body.orderItemId) {
      await prisma.orderItem.update({
        where: { id: body.orderItemId },
        data: { enrollmentId: enrollment.id },
      })
    }

    return NextResponse.json({ success: true, enrollment }, { status: 201 })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Inscripción inválida', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating enrollment:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 })
    }

    await requireSelfOrAdmin(request, userId)

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: { course: true, orderItems: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ enrollments })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching enrollments:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
