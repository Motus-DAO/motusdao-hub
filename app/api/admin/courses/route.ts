import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAdmin } from '@/lib/auth/admin-route'
import { createCourseSchema, cuid } from '@/lib/academy/admin-course'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ courses })
  } catch (error) {
    console.error('Error fetching admin courses:', error)
    return NextResponse.json({ error: 'No se pudieron cargar los cursos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const body = createCourseSchema.parse(await request.json())
    const course = await prisma.course.create({
      data: {
        id: cuid(),
        title: body.title,
        slug: body.slug,
        summary: body.summary,
        description: body.description || null,
        category: body.category || undefined,
        difficulty: body.difficulty,
        priceAmount: body.priceAmount,
        priceCurrency: body.priceCurrency,
        isPublished: body.isPublished ?? false,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Datos del curso inválidos', details: error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un curso con ese slug' },
        { status: 400 }
      )
    }

    console.error('Error creating course:', error)
    return NextResponse.json({ error: 'No se pudo crear el curso' }, { status: 500 })
  }
}
