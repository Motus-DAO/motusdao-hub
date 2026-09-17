import jwt from 'jsonwebtoken'
import type { JitsiRoomKind } from '@/lib/jitsi-policies'

export function signJitsiAccessToken(params: {
  roomName: string
  actorId: string
  userName?: string
  userEmail?: string
  moderator: boolean
  kind: JitsiRoomKind
}): string {
  const jitsiAppSecret = process.env.JITSI_APP_SECRET
  const jitsiAppId = process.env.JITSI_APP_ID

  if (!jitsiAppSecret || !jitsiAppId) {
    throw new Error('Jitsi JWT no está configurado')
  }

  const affiliation = params.moderator ? 'owner' : 'member'

  const payload = {
    iss: jitsiAppId,
    aud: 'jitsi',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
    nbf: Math.floor(Date.now() / 1000) - 10,
    room: params.roomName,
    sub: jitsiAppId,
    moderator: params.moderator,
    context: {
      user: {
        id: params.actorId,
        name: params.userName || 'Usuario',
        email: params.userEmail || '',
        moderator: params.moderator,
        affiliation,
      },
      features: {
        livestreaming: params.moderator,
        recording: params.moderator,
        'outbound-call': false,
      },
    },
  }

  return jwt.sign(payload, jitsiAppSecret, { algorithm: 'HS256' })
}

export function signJitsiGuestToken(params: {
  roomName: string
  guestId: string
  displayName: string
  /** Quick/sandbox rooms may grant mod so lobby does not block testing */
  moderator?: boolean
}): string {
  const jitsiAppSecret = process.env.JITSI_APP_SECRET
  const jitsiAppId = process.env.JITSI_APP_ID

  if (!jitsiAppSecret || !jitsiAppId) {
    throw new Error('Jitsi JWT no está configurado')
  }

  const isMod = params.moderator === true

  const payload = {
    iss: jitsiAppId,
    aud: 'jitsi',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
    nbf: Math.floor(Date.now() / 1000) - 10,
    room: params.roomName,
    sub: jitsiAppId,
    moderator: isMod,
    context: {
      user: {
        id: params.guestId,
        name: params.displayName,
        email: '',
        moderator: isMod,
        affiliation: isMod ? 'owner' : 'member',
      },
      features: {
        livestreaming: false,
        recording: false,
        'outbound-call': false,
      },
    },
  }

  return jwt.sign(payload, jitsiAppSecret, { algorithm: 'HS256' })
}
