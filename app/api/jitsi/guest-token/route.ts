import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parsePsmIdFromOpenRoom } from '@/lib/jitsi'
import { signJitsiGuestToken } from '@/lib/jitsi-token'

const DISPLAY_NAME_MAX = 48

function sanitizeDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, DISPLAY_NAME_MAX)
}

/**
 * POST /api/jitsi/guest-token
 * Public guest access for open PSM rooms only (motusdao-open-{psmId}).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomName, displayName } = body as {
      roomName?: string
      displayName?: string
    }

    if (!roomName) {
      return NextResponse.json({ error: 'roomName es requerido' }, { status: 400 })
    }

    const ownerPsmId = parsePsmIdFromOpenRoom(roomName)
    if (!ownerPsmId) {
      return NextResponse.json(
        { error: 'El acceso como invitado solo está disponible en enlaces abiertos' },
        { status: 403 }
      )
    }

    const owner = await prisma.user.findFirst({
      where: { id: ownerPsmId, role: 'psm', deletedAt: null },
      select: { id: true },
    })

    if (!owner) {
      return NextResponse.json(
        { error: 'Sala de invitados no disponible' },
        { status: 404 }
      )
    }

    const cleanName = sanitizeDisplayName(displayName || '')
    if (cleanName.length < 2) {
      return NextResponse.json(
        { error: 'Ingresa un nombre para mostrar (mínimo 2 caracteres)' },
        { status: 400 }
      )
    }

    const guestId = `guest-${randomUUID()}`
    const token = signJitsiGuestToken({
      roomName,
      guestId,
      displayName: cleanName,
    })

    return NextResponse.json({
      success: true,
      token,
      guestId,
      displayName: cleanName,
      moderator: false,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Jitsi JWT no está configurado') {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.error('Error generating guest Jitsi token:', error)
    return NextResponse.json(
      { error: 'Error interno al generar acceso de invitado' },
      { status: 500 }
    )
  }
}
