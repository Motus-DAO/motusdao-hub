import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createModuleSchema } from '@/lib/academy/admin-content'
import { cuid } from '@/lib/academy/admin-course'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'

type ModulesRouteContext = {
  params: Promise<{ courseId: string }>
}

export async function GET(request: NextRequest, { params }: ModulesRouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { courseId } = await params
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    })

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    const modules = await prisma.module.findMany({
      where: { courseId },
      include: {
        lessons: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ modules })
  } catch (error) {
    console.error('Error fetching course modules:', error)
    return NextResponse.json({ error: 'No se pudieron cargar los módulos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: ModulesRouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { courseId } = await params
    const body = createModuleSchema.parse(await request.json())
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    })

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 400 })
    }

    const lastModule = await prisma.module.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const createdModule = await prisma.module.create({
      data: {
        id: cuid(),
        courseId,
        title: body.title,
        summary: body.summary || null,
        order: body.order ?? (lastModule?.order ?? -1) + 1,
        updatedAt: new Date(),
      },
      include: { lessons: true },
    })

    return NextResponse.json({ module: createdModule }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Datos del módulo inválidos', details: error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    console.error('Error creating module:', error)
    return NextResponse.json({ error: 'No se pudo crear el módulo' }, { status: 500 })
  }
}
