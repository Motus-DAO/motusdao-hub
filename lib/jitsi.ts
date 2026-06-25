const JITSI_DEFAULT_DOMAIN = 'meet.jit.si'
const JITSI_DEFAULT_OFFICE_PREFIX = 'motusdao-office-'
const JITSI_DEFAULT_SESSION_PREFIX = 'motusdao-sess-'

export function getJitsiDomain(): string {
  return process.env.NEXT_PUBLIC_JITSI_DOMAIN || JITSI_DEFAULT_DOMAIN
}

/** Permanent therapy office per Match */
export function getOfficeRoomPrefix(): string {
  return process.env.NEXT_PUBLIC_JITSI_OFFICE_PREFIX || JITSI_DEFAULT_OFFICE_PREFIX
}

/** Legacy per-session rooms (still honored for old links) */
export function getJitsiRoomPrefix(): string {
  return process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX || JITSI_DEFAULT_SESSION_PREFIX
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

export function normalizeJitsiHost(domainOrUrl: string): string {
  if (domainOrUrl.includes('://')) {
    return new URL(domainOrUrl).host
  }
  return domainOrUrl
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

function buildJitsiUrlForRoom(roomName: string): string {
  const domain = getJitsiDomain()
  const host = domain.includes('://') ? new URL(domain).host : domain
  const protocol = getJitsiProtocol(domain)
  return `${protocol}://${host}/${roomName}`
}

/** Stable consultorio URL for a user–PSM match */
export function buildOfficeJitsiUrl(matchId: string): string {
  return buildJitsiUrlForRoom(buildOfficeRoomName(matchId))
}

/** Personal guest room for a PSM (non-patient meetings) */
export function buildOpenRoomName(psmId: string): string {
  return `${getOpenRoomPrefix()}${psmId}`
}

export function parsePsmIdFromOpenRoom(roomName: string): string | null {
  const prefix = getOpenRoomPrefix()
  if (!roomName.startsWith(prefix)) return null
  const psmId = roomName.slice(prefix.length)
  return psmId.length > 0 ? psmId : null
}

export function getOpenRoomPrefix(): string {
  return process.env.NEXT_PUBLIC_JITSI_OPEN_PREFIX || 'motusdao-open-'
}

export function buildOpenJitsiUrl(psmId: string): string {
  return buildJitsiUrlForRoom(buildOpenRoomName(psmId))
}

/** @deprecated Legacy per-session URL — prefer buildOfficeJitsiUrl */
export function buildJitsiUrl(sessionId: string): string {
  return buildJitsiUrlForRoom(buildJitsiRoomName(sessionId))
}

/** Hub route that embeds Jitsi inside /videochat */
export function buildVideochatUrl(externalUrl: string): string {
  return `/videochat?url=${encodeURIComponent(externalUrl)}`
}
