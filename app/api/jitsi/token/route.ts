import { NextRequest, NextResponse } from 'next/server'
import { assertAuthenticatedUser, isAdmin } from '@/lib/auth/guards'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { AuthError } from '@/lib/auth/errors'
import { authorizeJitsiRoomAccess, getJitsiRoomKind } from '@/lib/jitsi-policies'
import { resolveJitsiDisplayName } from '@/lib/jitsi-display-name'
import { signJitsiAccessToken } from '@/lib/jitsi-token'

/**
 * POST /api/jitsi/token
 * Issues JWT for Hub-managed Jitsi rooms (clinical / metaverse / open prefixes).
 *
 * WorkAdventure metaverse zones use WA's own JWT (SECRET_JITSI_KEY on the WA server).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const session = await requireSession(request)
    const actorId = assertAuthenticatedUser(session)
    const { roomName, userId, userEmail } = body as {
      roomName?: string
      userId?: string
      userName?: string
      userEmail?: string
    }

    if (!roomName) {
      return NextResponse.json(
        { error: 'roomName es requerido' },
        { status: 400 }
      )
    }

    if (userId && userId !== actorId && !isAdmin(session)) {
      throw new AuthError(403, 'Not authorized for this Jitsi user')
    }

    const access = await authorizeJitsiRoomAccess({
      roomName,
      actorId,
      isAdmin: isAdmin(session),
    })

    if (!access.allowed) {
      throw new AuthError(403, access.reason || 'No autorizado para esta sala')
    }

    const displayName = await resolveJitsiDisplayName(actorId)

    const token = signJitsiAccessToken({
      roomName,
      actorId,
      userName: displayName,
      userEmail,
      moderator: access.moderator,
      kind: access.kind,
    })

    return NextResponse.json({
      success: true,
      token,
      kind: getJitsiRoomKind(roomName),
      moderator: access.moderator,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof Error && error.message === 'Jitsi JWT no está configurado') {
      return NextResponse.json(
        {
          error: error.message,
          hint: 'Configura JITSI_APP_SECRET y JITSI_APP_ID en tus variables de entorno',
        },
        { status: 500 }
      )
    }

    console.error('Error generating Jitsi JWT token:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al generar token' },
      { status: 500 }
    )
  }
}
