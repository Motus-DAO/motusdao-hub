import { prisma } from '@/lib/prisma'
import { getJitsiRoomPrefix, parseMatchIdFromOfficeRoom, parsePsmIdFromOpenRoom } from '@/lib/jitsi'

export type JitsiRoomKind = 'office' | 'clinical' | 'metaverse' | 'open' | 'unknown'

export interface JitsiAccessResult {
  allowed: boolean
  kind: JitsiRoomKind
  moderator: boolean
  reason?: string
}

export function getMetaverseRoomPrefix(): string {
  return process.env.NEXT_PUBLIC_JITSI_METAVERSE_PREFIX || 'motusdao-meta-'
}

export function getJitsiRoomKind(roomName: string): JitsiRoomKind {
  if (parseMatchIdFromOfficeRoom(roomName)) return 'office'
  if (parsePsmIdFromOpenRoom(roomName)) return 'open'
  if (roomName.startsWith(getJitsiRoomPrefix())) return 'clinical'
  if (roomName.startsWith(getMetaverseRoomPrefix())) return 'metaverse'
  return 'unknown'
}

async function authorizeOfficeRoom(
  roomName: string,
  actorId: string
): Promise<JitsiAccessResult> {
  const matchId = parseMatchIdFromOfficeRoom(roomName)
  if (!matchId) {
    return {
      allowed: false,
      kind: 'office',
      moderator: false,
      reason: 'Sala de consultorio inválida.',
    }
  }

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      status: 'active',
      OR: [{ userId: actorId }, { psmId: actorId }],
    },
    select: { psmId: true },
  })

  if (!match) {
    return {
      allowed: false,
      kind: 'office',
      moderator: false,
      reason: 'No tienes acceso a este consultorio o el emparejamiento ya no está activo.',
    }
  }

  return {
    allowed: true,
    kind: 'office',
    moderator: match.psmId === actorId,
  }
}

async function authorizeOpenRoom(
  roomName: string,
  actorId: string
): Promise<JitsiAccessResult> {
  const ownerPsmId = parsePsmIdFromOpenRoom(roomName)
  if (!ownerPsmId) {
    return {
      allowed: false,
      kind: 'open',
      moderator: false,
      reason: 'Enlace de invitados inválido.',
    }
  }

  const owner = await prisma.user.findFirst({
    where: { id: ownerPsmId, role: 'psm', deletedAt: null },
    select: { id: true },
  })

  if (!owner) {
    return {
      allowed: false,
      kind: 'open',
      moderator: false,
      reason: 'Este enlace de invitados no pertenece a un profesional activo.',
    }
  }

  return {
    allowed: true,
    kind: 'open',
    moderator: actorId === ownerPsmId,
  }
}

/**
 * Hub-issued JWT policies (modular by room prefix).
 * WorkAdventure zones use WA's own JWT path on the WA server.
 */
export async function authorizeJitsiRoomAccess(params: {
  roomName: string
  actorId: string
  isAdmin: boolean
}): Promise<JitsiAccessResult> {
  const { roomName, actorId, isAdmin } = params
  const kind = getJitsiRoomKind(roomName)

  if (isAdmin) {
    return { allowed: true, kind, moderator: true }
  }

  switch (kind) {
    case 'office':
      return authorizeOfficeRoom(roomName, actorId)

    case 'clinical': {
      const therapySession = await prisma.session.findFirst({
        where: {
          externalUrl: { contains: roomName },
          status: { in: ['requested', 'accepted'] },
          OR: [{ userId: actorId }, { psmId: actorId }],
        },
        select: { psmId: true },
      })

      if (!therapySession) {
        return {
          allowed: false,
          kind,
          moderator: false,
          reason: 'No tienes una sesión activa para esta sala.',
        }
      }

      return {
        allowed: true,
        kind,
        moderator: therapySession.psmId === actorId,
      }
    }

    case 'metaverse':
      return { allowed: true, kind, moderator: false }

    case 'open':
      return authorizeOpenRoom(roomName, actorId)

    default:
      return {
        allowed: false,
        kind,
        moderator: false,
        reason:
          'Sala no reconocida. Usa tu consultorio desde Perfil o el metaverso desde WorkAdventure.',
      }
  }
}

export function buildMetaverseJitsiRoomName(zoneSlug: string): string {
  const slug = zoneSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${getMetaverseRoomPrefix()}${slug}`
}
