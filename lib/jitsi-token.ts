import jwt from 'jsonwebtoken'
import {
  meetingSecretKindForRoom,
  refuseGuestToken,
  type JitsiRoomKind,
  type JitsiSecretKind,
} from '@/lib/jitsi'

export function readJitsiSigningKey(kind: JitsiSecretKind): { appId: string; secret: string } {
  if (kind === 'therapy') {
    const secret = process.env.JITSI_APP_SECRET
    const appId = process.env.JITSI_APP_ID
    if (!secret || !appId) {
      throw new Error('Jitsi JWT no está configurado')
    }
    return { appId, secret }
  }

  const secret = process.env.JITSI_OPEN_APP_SECRET
  const appId = process.env.JITSI_OPEN_APP_ID
  if (!secret || !appId) {
    throw new Error('Jitsi abierto no está configurado')
  }
  if (secret === process.env.JITSI_APP_SECRET) {
    throw new Error('El secreto del Jitsi abierto no puede ser el de terapia')
  }
  return { appId, secret }
}

export function signJitsiAccessToken(params: {
  roomName: string
  actorId: string
  userName?: string
  userEmail?: string
  moderator: boolean
  kind: JitsiRoomKind
  secretKind: JitsiSecretKind
}): string {
  const expected = meetingSecretKindForRoom(params.roomName)
  if (!expected || expected !== params.secretKind) {
    throw new Error('El secreto no corresponde a esta sala')
  }

  const { appId, secret } = readJitsiSigningKey(params.secretKind)
  const affiliation = params.moderator ? 'owner' : 'member'

  const payload = {
    iss: appId,
    aud: 'jitsi',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
    nbf: Math.floor(Date.now() / 1000) - 10,
    room: params.roomName,
    sub: appId,
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

  return jwt.sign(payload, secret, { algorithm: 'HS256' })
}

export function signJitsiGuestToken(params: {
  roomName: string
  guestId: string
  displayName: string
  /** Quick/sandbox rooms may grant mod so lobby does not block testing */
  moderator?: boolean
}): string {
  const refused = refuseGuestToken(params.roomName)
  if (refused) {
    throw new Error(refused.error)
  }

  const { appId, secret } = readJitsiSigningKey('open')
  const isMod = params.moderator === true

  const payload = {
    iss: appId,
    aud: 'jitsi',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
    nbf: Math.floor(Date.now() / 1000) - 10,
    room: params.roomName,
    sub: appId,
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

  return jwt.sign(payload, secret, { algorithm: 'HS256' })
}
