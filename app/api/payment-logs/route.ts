import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'

/**
 * POST /api/payment-logs
 * Creates a payment log entry
 * 
 * Body: {
 *   fromUserId: string,
 *   toUserId?: string,
 *   destination: 'own_wallet' | 'matched_psm' | 'dao_treasury',
 *   destinationAddress: string,
 *   amount: string,
 *   currency: string,
 *   transactionHash: string,
 *   explorerUrl?: string,
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      fromUserId,
      toUserId,
      destination,
      destinationAddress,
      amount,
      currency,
      transactionHash,
      explorerUrl,
      notes,
      orderId,
      paymentId,
      sessionId,
      enrollmentId
    } = body

    // Validate required fields
    if (!fromUserId || !destination || !destinationAddress || !amount || !currency || !transactionHash) {
      return NextResponse.json(
        { error: 'Campos requeridos: fromUserId, destination, destinationAddress, amount, currency, transactionHash' },
        { status: 400 }
      )
    }

    if (!['own_wallet', 'matched_psm', 'dao_treasury'].includes(destination)) {
      return NextResponse.json(
        { error: 'destination debe ser: own_wallet, matched_psm, o dao_treasury' },
        { status: 400 }
      )
    }

    // If destination is matched_psm, toUserId should be provided
    if (destination === 'matched_psm' && !toUserId) {
      return NextResponse.json(
        { error: 'toUserId es requerido cuando destination es matched_psm' },
        { status: 400 }
      )
    }

    await requireSelfOrAdmin(request, fromUserId)

    if (destination === 'matched_psm') {
      const activeMatch = await prisma.match.findFirst({
        where: {
          userId: fromUserId,
          psmId: toUserId,
          status: 'active',
        },
        select: { id: true },
      })

      if (!activeMatch) {
        return NextResponse.json(
          { error: 'No existe un match activo con el profesional indicado' },
          { status: 400 }
        )
      }
    }

    // Check if transaction hash already exists
    const existingLog = await prisma.paymentLog.findUnique({
      where: { transactionHash }
    })

    if (existingLog) {
      return NextResponse.json(
        { error: 'Esta transacción ya fue registrada' },
        { status: 409 }
      )
    }

    const paymentLog = await prisma.paymentLog.create({
      data: {
        fromUserId,
        toUserId: destination === 'matched_psm' ? toUserId : null,
        destination: destination as 'own_wallet' | 'matched_psm' | 'dao_treasury',
        destinationAddress,
        amount,
        currency,
        transactionHash,
        explorerUrl,
        notes,
        orderId,
        paymentId,
        sessionId,
        enrollmentId
      },
      include: {
        fromUser: {
          include: {
            profile: true
          }
        },
        toUser: {
          include: {
            profile: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Registro de pago creado exitosamente',
      paymentLog: {
        id: paymentLog.id,
        fromUserId: paymentLog.fromUserId,
        toUserId: paymentLog.toUserId,
        destination: paymentLog.destination,
        destinationAddress: paymentLog.destinationAddress,
        amount: paymentLog.amount,
        currency: paymentLog.currency,
        transactionHash: paymentLog.transactionHash,
        explorerUrl: paymentLog.explorerUrl,
        notes: paymentLog.notes,
        orderId: paymentLog.orderId,
        paymentId: paymentLog.paymentId,
        sessionId: paymentLog.sessionId,
        enrollmentId: paymentLog.enrollmentId,
        createdAt: paymentLog.createdAt,
        fromUser: {
          id: paymentLog.fromUser.id,
          email: paymentLog.fromUser.email,
          nombre: paymentLog.fromUser.profile?.nombre,
          apellido: paymentLog.fromUser.profile?.apellido
        },
        toUser: paymentLog.toUser ? {
          id: paymentLog.toUser.id,
          email: paymentLog.toUser.email,
          nombre: paymentLog.toUser.profile?.nombre,
          apellido: paymentLog.toUser.profile?.apellido
        } : null
      }
    }, { status: 201 })

  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error creating payment log:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/payment-logs?userId=xxx&type=sent|received
 * Gets payment logs for a user
 * 
 * Query params:
 * - userId: string (required)
 * - type: 'sent' | 'received' (optional, defaults to 'sent')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'sent'

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      )
    }

    await requireSelfOrAdmin(request, userId)

    if (!['sent', 'received'].includes(type)) {
      return NextResponse.json(
        { error: 'type debe ser "sent" o "received"' },
        { status: 400 }
      )
    }

    const where = type === 'sent'
      ? { fromUserId: userId }
      : { toUserId: userId }

    const paymentLogs = await prisma.paymentLog.findMany({
      where,
      include: {
        fromUser: {
          include: {
            profile: true
          }
        },
        toUser: {
          include: {
            profile: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      paymentLogs: paymentLogs.map(log => ({
        id: log.id,
        fromUserId: log.fromUserId,
        toUserId: log.toUserId,
        destination: log.destination,
        destinationAddress: log.destinationAddress,
        amount: log.amount,
        currency: log.currency,
        transactionHash: log.transactionHash,
        explorerUrl: log.explorerUrl,
        notes: log.notes,
        orderId: log.orderId,
        paymentId: log.paymentId,
        sessionId: log.sessionId,
        enrollmentId: log.enrollmentId,
        createdAt: log.createdAt,
        fromUser: {
          id: log.fromUser.id,
          email: log.fromUser.email,
          nombre: log.fromUser.profile?.nombre,
          apellido: log.fromUser.profile?.apellido
        },
        toUser: log.toUser ? {
          id: log.toUser.id,
          email: log.toUser.email,
          nombre: log.toUser.profile?.nombre,
          apellido: log.toUser.profile?.apellido
        } : null
      }))
    })

  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching payment logs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
















