import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'

const slotSchema = z.object({
  psmId: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  timezone: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  isAvailable: z.boolean().default(true),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = slotSchema.parse(await request.json())
    await requireSelfOrAdmin(request, body.psmId)

    const startsAt = new Date(body.startsAt)
    const endsAt = new Date(body.endsAt)
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return NextResponse.json({ error: 'Horario inválido' }, { status: 400 })
    }

    const psm = await prisma.user.findUnique({
      where: { id: body.psmId },
      select: { role: true },
    })

    if (!psm || psm.role !== 'psm') {
      return NextResponse.json({ error: 'PSM no encontrado' }, { status: 404 })
    }

    const slot = await prisma.providerAvailabilitySlot.create({
      data: {
        psmId: body.psmId,
        startsAt,
        endsAt,
        timezone: body.timezone,
        isRecurring: body.isRecurring,
        recurrenceRule: body.recurrenceRule,
        isAvailable: body.isAvailable,
        notes: body.notes,
      },
    })

    return NextResponse.json({ success: true, slot }, { status: 201 })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Disponibilidad inválida', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating availability slot:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const psmId = searchParams.get('psmId')

    if (!psmId) {
      return NextResponse.json({ error: 'psmId es requerido' }, { status: 400 })
    }

    await requireSelfOrAdmin(request, psmId)

    const slots = await prisma.providerAvailabilitySlot.findMany({
      where: { psmId },
      orderBy: { startsAt: 'asc' },
    })

    return NextResponse.json({ slots })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching availability slots:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
