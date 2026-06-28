import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateCourseSchema } from '@/lib/academy/admin-course'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'

type CourseRouteContext = {
  params: Promise<{ courseId: string }>
}

export async function GET(request: NextRequest, { params }: CourseRouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { courseId } = await params
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ course })
  } catch (error) {
    console.error('Error fetching admin course:', error)
    return NextResponse.json({ error: 'No se pudo cargar el curso' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: CourseRouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { courseId } = await params
    const body = updateCourseSchema.parse(await request.json())
    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...body,
        description: body.description === '' ? null : body.description,
        category: body.category === '' ? null : body.category,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ course })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Datos del curso inválidos', details: error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe un curso con ese slug' }, { status: 400 })
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
      }
    }

    console.error('Error updating course:', error)
    return NextResponse.json({ error: 'No se pudo actualizar el curso' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: CourseRouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { courseId } = await params
    await prisma.course.delete({ where: { id: courseId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    console.error('Error deleting course:', error)
    return NextResponse.json({ error: 'No se pudo eliminar el curso' }, { status: 500 })
  }
}
