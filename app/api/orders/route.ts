import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import { toInputJson } from '@/lib/prisma-json'

const orderItemSchema = z.object({
  type: z.enum(['session', 'course', 'subscription', 'donation', 'provider_payout', 'dao_treasury']),
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitAmount: z.union([z.string(), z.number()]),
  currency: z.string().default('MXN'),
  sessionId: z.string().optional(),
  courseId: z.string().optional(),
  enrollmentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const createOrderSchema = z.object({
  userId: z.string().min(1),
  currency: z.string().default('MXN'),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  items: z.array(orderItemSchema).min(1),
})

function toAmount(value: string | number): number {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid amount')
  }
  return amount
}

export async function POST(request: NextRequest) {
  try {
    const body = createOrderSchema.parse(await request.json())
    await requireSelfOrAdmin(request, body.userId)

    const items = body.items.map(item => {
      const unitAmount = toAmount(item.unitAmount)
      const totalAmount = unitAmount * item.quantity
      return { ...item, unitAmount, totalAmount }
    })
    const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0)

    const order = await prisma.order.create({
      data: {
        userId: body.userId,
        currency: body.currency,
        subtotalAmount: totalAmount,
        totalAmount,
        notes: body.notes,
        metadata: body.metadata ? toInputJson(body.metadata) : undefined,
        items: {
          create: items.map(item => ({
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitAmount: item.unitAmount,
            totalAmount: item.totalAmount,
            currency: item.currency,
            sessionId: item.sessionId,
            courseId: item.courseId,
            enrollmentId: item.enrollmentId,
            metadata: item.metadata ? toInputJson(item.metadata) : undefined,
          })),
        },
      },
      include: { items: true, payments: true },
    })

    return NextResponse.json({ success: true, order }, { status: 201 })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Orden inválida', details: error.errors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: message === 'Invalid amount' ? 400 : 500 })
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

    const orders = await prisma.order.findMany({
      where: { userId },
      include: { items: true, payments: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
