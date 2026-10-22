export const THERAPY_JITSI_HOST = 'jitsi.motusdao.org'
export const OPEN_JITSI_HOST = 'meet.motusdao.org'

const JITSI_DEFAULT_OFFICE_PREFIX = 'motusdao-office-'
const JITSI_DEFAULT_SESSION_PREFIX = 'motusdao-sess-'

export type JitsiRoomKind = 'office' | 'clinical' | 'metaverse' | 'open' | 'quick' | 'unknown'
export type JitsiSecretKind = 'therapy' | 'open'

/**
 * Therapy links do not read NEXT_PUBLIC_JITSI_DOMAIN.
 * A missing value cannot fall through to meet.jit.si.
 */
export function getJitsiDomain(): string {
  return THERAPY_JITSI_HOST
}

/** Permanent therapy office per Match */
export function getOfficeRoomPrefix(): string {
  return process.env.NEXT_PUBLIC_JITSI_OFFICE_PREFIX || JITSI_DEFAULT_OFFICE_PREFIX
}

/** Legacy per-session rooms (still honored for old links) */
export function getJitsiRoomPrefix(): string {
  return process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX || JITSI_DEFAULT_SESSION_PREFIX
}

export function getOpenRoomPrefix(): string {
  return process.env.NEXT_PUBLIC_JITSI_OPEN_PREFIX || 'motusdao-open-'
}

export function getQuickRoomPrefix(): string {
  return process.env.NEXT_PUBLIC_JITSI_QUICK_PREFIX || 'motusdao-quick-'
}

export function getMetaverseRoomPrefix(): string {
  return process.env.NEXT_PUBLIC_JITSI_METAVERSE_PREFIX || 'motusdao-meta-'
}

export function buildOfficeRoomName(matchId: string): string {
  return `${getOfficeRoomPrefix()}${matchId}`
}

export function buildJitsiRoomName(sessionId: string): string {
  return `${getJitsiRoomPrefix()}${sessionId}`
}

export function parseMatchIdFromOfficeRoom(roomName: string): string | null {
  const prefix = getOfficeRoomPrefix()
  if (!roomName.startsWith(prefix)) return null
  const matchId = roomName.slice(prefix.length)
  return matchId.length > 0 ? matchId : null
}

export function buildOpenRoomName(psmId: string): string {
  return `${getOpenRoomPrefix()}${psmId}`
}

export function parsePsmIdFromOpenRoom(roomName: string): string | null {
  const prefix = getOpenRoomPrefix()
  if (!roomName.startsWith(prefix)) return null
  const psmId = roomName.slice(prefix.length)
  return psmId.length > 0 ? psmId : null
}

export function isJitsiQuickRoomsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_JITSI_QUICK_ROOMS === 'true'
}

export function buildQuickRoomName(slug: string): string {
  const clean = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `${getQuickRoomPrefix()}${clean || 'demo'}`
}

export function parseQuickRoomSlug(roomName: string): string | null {
  const prefix = getQuickRoomPrefix()
  if (!roomName.startsWith(prefix)) return null
  const slug = roomName.slice(prefix.length)
  return slug.length > 0 ? slug : null
}

export function getJitsiRoomKind(roomName: string): JitsiRoomKind {
  if (parseMatchIdFromOfficeRoom(roomName)) return 'office'
  if (parsePsmIdFromOpenRoom(roomName)) return 'open'
  if (parseQuickRoomSlug(roomName)) return 'quick'
  if (roomName.startsWith(getJitsiRoomPrefix())) return 'clinical'
  if (roomName.startsWith(getMetaverseRoomPrefix())) return 'metaverse'
  return 'unknown'
}

/** Office and clinical rooms stay on the private server. Everything else that we recognize is an open meeting. */
export function meetingHostForRoom(roomName: string): string | null {
  const kind = getJitsiRoomKind(roomName)
  if (kind === 'office' || kind === 'clinical') return THERAPY_JITSI_HOST
  if (kind === 'open' || kind === 'quick' || kind === 'metaverse') return OPEN_JITSI_HOST
  return null
}

export function meetingSecretKindForRoom(roomName: string): JitsiSecretKind | null {
  const kind = getJitsiRoomKind(roomName)
  if (kind === 'office' || kind === 'clinical') return 'therapy'
  if (kind === 'open' || kind === 'quick' || kind === 'metaverse') return 'open'
  return null
}

export function normalizeJitsiHost(domainOrUrl: string): string {
  if (domainOrUrl.includes('://')) {
    return new URL(domainOrUrl).host
  }
  return domainOrUrl
}

export function isPublicJitsiHost(host: string): boolean {
  const name = normalizeJitsiHost(host).toLowerCase().split(':')[0]
  return name === 'meet.jit.si' || name.endsWith('.jit.si')
}

export function getJitsiProtocol(domain = getJitsiDomain()): 'http' | 'https' {
  if (domain.includes('://')) {
    const url = new URL(domain)
    return url.protocol === 'http:' ? 'http' : 'https'
  }
  return domain.includes('localhost') || domain.includes('127.0.0.1')
    ? 'http'
    : 'https'
}

export function canOpenJitsiMeeting(params: {
  domain: string
  roomName: string
  jwt?: string | null
}): boolean {
  const expected = meetingHostForRoom(params.roomName)
  if (!expected) return false
  const host = normalizeJitsiHost(params.domain).toLowerCase()
  if (isPublicJitsiHost(host)) return false
  if (host !== expected) return false
  if (!params.jwt || params.jwt.trim().length === 0) return false
  return true
}

function roomNameFromPath(pathname: string): string | null {
  const segment = pathname.replace(/^\//, '').split('/').filter(Boolean)[0]
  if (!segment) return null
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * The host in a pasted link is not trusted.
 * Therapy rooms land on jitsi.motusdao.org. Open meetings land on meet.motusdao.org.
 */
export function resolveVideochatRoom(input: {
  url?: string | null
  room?: string | null
}): { domain: string; roomName: string } | null {
  if (input.url) {
    try {
      const parsed = new URL(input.url)
      const roomName = roomNameFromPath(parsed.pathname)
      if (!roomName) return null
      const domain = meetingHostForRoom(roomName)
      return domain ? { domain, roomName } : null
    } catch {
      // Invalid URL. Fall through to ?room= when present.
    }
  }

  const roomName = input.room?.trim()
  if (!roomName) return null
  const domain = meetingHostForRoom(roomName)
  return domain ? { domain, roomName } : null
}

/**
 * Top-level Jitsi Meet URL. Refuses a therapy or open room that has no Hub JWT,
 * and refuses any host other than the one for that room.
 */
export function buildNativeJitsiMeetingUrl(params: {
  domain: string
  roomName: string
  jwt?: string | null
}): string {
  if (!canOpenJitsiMeeting(params)) {
    throw new Error('La sala no se abre sin un token del Hub')
  }
  const host = normalizeJitsiHost(params.domain)
  const protocol = getJitsiProtocol(params.domain)
  const roomPath = params.roomName
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  const url = new URL(`${protocol}://${host}/${roomPath}`)
  if (params.jwt) {
    url.searchParams.set('jwt', params.jwt)
  }
  return url.toString()
}

function buildJitsiUrlForRoom(roomName: string): string {
  const domain = meetingHostForRoom(roomName)
  if (!domain) {
    throw new Error('Sala de video no reconocida')
  }
  const protocol = getJitsiProtocol(domain)
  return `${protocol}://${domain}/${roomName}`
}

/** Stable consultorio URL for a user–PSM match. Always the private server. */
export function buildOfficeJitsiUrl(matchId: string): string {
  return buildJitsiUrlForRoom(buildOfficeRoomName(matchId))
}

export function buildOpenJitsiUrl(psmId: string): string {
  return buildJitsiUrlForRoom(buildOpenRoomName(psmId))
}

export function buildQuickJitsiUrl(slug: string): string {
  return buildJitsiUrlForRoom(buildQuickRoomName(slug))
}

/** @deprecated Legacy per-session URL — prefer buildOfficeJitsiUrl */
export function buildJitsiUrl(sessionId: string): string {
  return buildJitsiUrlForRoom(buildJitsiRoomName(sessionId))
}

/** Stored therapy link. A client-supplied URL is not used. */
export function therapySessionExternalUrl(matchId: string): string {
  return buildOfficeJitsiUrl(matchId)
}

export function refuseGuestToken(roomName: string): { status: 403; error: string } | null {
  const kind = getJitsiRoomKind(roomName)
  if (kind === 'office' || kind === 'clinical') {
    return {
      status: 403,
      error: 'Un invitado no puede abrir un consultorio ni una sala clínica.',
    }
  }
  if (kind === 'quick') {
    if (!isJitsiQuickRoomsEnabled()) {
      return { status: 403, error: 'Salas rápidas desactivadas' }
    }
    return null
  }
  if (kind === 'open') return null
  return {
    status: 403,
    error: 'El acceso como invitado solo está disponible en enlaces abiertos o salas rápidas',
  }
}

/** Hub route that embeds Jitsi inside /videochat */
export function buildVideochatUrl(externalUrl: string): string {
  return `/videochat?url=${encodeURIComponent(externalUrl)}`
}
