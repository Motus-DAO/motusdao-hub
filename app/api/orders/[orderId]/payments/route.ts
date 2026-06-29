import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import { toInputJson } from '@/lib/prisma-json'

const paymentSchema = z.object({
  amount: z.union([z.string(), z.number()]),
  currency: z.string(),
  destination: z.enum(['own_wallet', 'matched_psm', 'dao_treasury']),
  destinationAddress: z.string().min(1),
  provider: z.enum(['onchain', 'transak', 'stripe', 'manual']).default('onchain'),
  status: z.enum(['pending', 'confirmed', 'failed', 'refunded']).default('confirmed'),
  transactionHash: z.string().optional(),
  explorerUrl: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const body = paymentSchema.parse(await request.json())
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    await requireSelfOrAdmin(request, order.userId)

    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }

    const result = await prisma.$transaction(async tx => {
      const payment = await tx.payment.create({
        data: {
          orderId,
          userId: order.userId,
          amount,
          currency: body.currency,
          destination: body.destination,
          destinationAddress: body.destinationAddress,
          provider: body.provider,
          status: body.status,
          transactionHash: body.transactionHash,
          explorerUrl: body.explorerUrl,
          metadata: body.metadata ? toInputJson(body.metadata) : undefined,
          confirmedAt: body.status === 'confirmed' ? new Date() : null,
          failedAt: body.status === 'failed' ? new Date() : null,
        },
      })

      if (body.status === 'confirmed') {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'paid',
            completedAt: new Date(),
          },
        })
      }

      if (body.transactionHash) {
        await tx.paymentLog.create({
          data: {
            fromUserId: order.userId,
            destination: body.destination,
            destinationAddress: body.destinationAddress,
            amount: String(body.amount),
            currency: body.currency,
            transactionHash: body.transactionHash,
            explorerUrl: body.explorerUrl,
            notes: `Order ${orderId}`,
            orderId,
            paymentId: payment.id,
            sessionId: order.items.find(item => item.sessionId)?.sessionId ?? null,
            enrollmentId: order.items.find(item => item.enrollmentId)?.enrollmentId ?? null,
          },
        })
      }

      return payment
    })

    return NextResponse.json({ success: true, payment: result }, { status: 201 })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Pago inválido', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error recording order payment:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
