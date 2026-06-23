import { NextRequest, NextResponse } from 'next/server'
import { SessionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import { recordClinicalAccess } from '@/lib/clinical-audit'

// Helper: build random Jitsi room URL (configurable for producción)
const buildJitsiUrl = () => {
  const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si'
  const roomPrefix = process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX || 'motusdao-'
  const random = Math.random().toString(36).substring(2, 10)
  const roomName = `${roomPrefix}${random}`
  return `https://${domain}/${roomName}`
}

/**
 * POST /api/sessions
 * Crea una nueva sesión de terapia para un usuario ya emparejado
 *
 * Body: { userId: string, externalUrl?: string }
 *
 * - Verifica que el usuario exista y sea role === 'usuario'
 * - Verifica que tenga un Match activo con un PSM
 * - Si ya existe una sesión en estado requested/accepted, la devuelve
 * - Si no, crea una nueva sesión con modo video_external y un link de Jitsi
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      externalUrl,
      scheduledStart,
      scheduledEnd,
      timezone,
      durationMinutes,
    } = body as {
      userId?: string
      externalUrl?: string
      scheduledStart?: string
      scheduledEnd?: string
      timezone?: string
      durationMinutes?: number
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      )
    }

    const sessionActor = await requireSelfOrAdmin(request, userId)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userMatches: {
          where: { status: 'active' },
          include: {
            psm: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if (user.role !== 'usuario') {
      return NextResponse.json(
        { error: 'Solo los usuarios pueden solicitar sesiones de terapia' },
        { status: 400 }
      )
    }

    const activeMatch = user.userMatches[0]

    if (!activeMatch) {
      return NextResponse.json(
        { error: 'No tienes un profesional emparejado actualmente' },
        { status: 400 }
      )
    }

    // Check if there is already a pending/accepted session for this user
    const existingSession = await prisma.session.findFirst({
      where: {
        userId: user.id,
        status: {
          in: [SessionStatus.requested, SessionStatus.accepted],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          include: { profile: true },
        },
        psm: {
          include: { profile: true },
        },
        match: true,
      },
    })

    if (existingSession) {
      return NextResponse.json(
        {
          session: existingSession,
          message: 'Ya tienes una sesión pendiente o aceptada',
        },
        { status: 200 }
      )
    }

    const url = externalUrl || buildJitsiUrl()

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        psmId: activeMatch.psmId,
        matchId: activeMatch.id,
        status: 'requested',
        mode: 'video_external',
        externalUrl: url,
        requestedAt: new Date(),
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        timezone: timezone || null,
        durationMinutes: durationMinutes || null,
      },
      include: {
        user: {
          include: { profile: true },
        },
        psm: {
          include: { profile: true },
        },
        match: true,
      },
    })

    await recordClinicalAccess({
      request,
      actorUserId: sessionActor.userId,
      targetUserId: user.id,
      action: 'create',
      resource: 'session',
      resourceId: session.id,
      reason: 'session_request',
      metadata: { psmId: activeMatch.psmId, scheduledStart, scheduledEnd },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Sesión creada correctamente',
        session,
      },
      { status: 201 }
    )
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sessions
 * Obtiene la sesión activa (requested/accepted) para un usuario o PSM
 *
 * Query params:
 * - userId: string (prioridad)
 * - psmId: string (alternativa para vista del terapeuta)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const psmId = searchParams.get('psmId')

    if (!userId && !psmId) {
      return NextResponse.json(
        { error: 'Se requiere userId o psmId' },
        { status: 400 }
      )
    }

    const sessionActor = await requireSelfOrAdmin(request, userId || psmId!)

    const where = userId
      ? { userId, status: { in: [SessionStatus.requested, SessionStatus.accepted] } }
      : { psmId: psmId!, status: { in: [SessionStatus.requested, SessionStatus.accepted] } }

    const session = await prisma.session.findFirst({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          include: { profile: true },
        },
        psm: {
          include: { profile: true },
        },
        match: true,
      },
    })

    await recordClinicalAccess({
      request,
      actorUserId: sessionActor.userId,
      targetUserId: userId || psmId,
      action: 'read',
      resource: 'session',
      resourceId: session?.id ?? null,
      reason: 'active_session_fetch',
    })

    return NextResponse.json({
      activeSession: session || null,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}



