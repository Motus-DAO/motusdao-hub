import { PSYCHAT_ARCHIVE_PAYLOAD_VERSION } from './constants'

export type PsychatArchiveMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type PsychatArchivePayload = {
  v: typeof PSYCHAT_ARCHIVE_PAYLOAD_VERSION
  savedAt: string
  messages: PsychatArchiveMessage[]
}

export function serializePsychatArchivePayload(payload: PsychatArchivePayload): string {
  return JSON.stringify(payload)
}

export function parsePsychatArchivePayload(json: string): PsychatArchivePayload {
  const parsed = JSON.parse(json) as PsychatArchivePayload
  if (parsed.v !== PSYCHAT_ARCHIVE_PAYLOAD_VERSION) {
    throw new Error('Unsupported Psychat archive payload version')
  }
  if (!Array.isArray(parsed.messages)) {
    throw new Error('Invalid Psychat archive payload')
  }
  return {
    v: PSYCHAT_ARCHIVE_PAYLOAD_VERSION,
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    messages: parsed.messages.filter(
      (m): m is PsychatArchiveMessage =>
        Boolean(m) &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string'
    ),
  }
}
