import { SAFE_NOTES_PAYLOAD_VERSION } from './constants'

export type SafeNotesPayload = {
  v: typeof SAFE_NOTES_PAYLOAD_VERSION
  content: string
  mood: string
  tags: string[]
}

export function serializeSafeNotesPayload(payload: SafeNotesPayload): string {
  return JSON.stringify(payload)
}

export function parseSafeNotesPayload(json: string): SafeNotesPayload {
  const parsed = JSON.parse(json) as SafeNotesPayload
  if (parsed.v !== SAFE_NOTES_PAYLOAD_VERSION) {
    throw new Error('Unsupported bitácora payload version')
  }
  if (typeof parsed.content !== 'string') {
    throw new Error('Invalid bitácora payload')
  }
  return {
    v: SAFE_NOTES_PAYLOAD_VERSION,
    content: parsed.content,
    mood: typeof parsed.mood === 'string' ? parsed.mood : 'neutral',
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.filter((t): t is string => typeof t === 'string')
      : [],
  }
}

/** Pre–slice-7 rows: migration stored legacy fields as JSON in `ciphertext`. */
export function parseLegacyPlaintextRow(ciphertext: string): SafeNotesPayload {
  try {
    const parsed = JSON.parse(ciphertext) as {
      content?: string
      mood?: string
      tags?: unknown
    }
    if (typeof parsed.content === 'string') {
      return {
        v: SAFE_NOTES_PAYLOAD_VERSION,
        content: parsed.content,
        mood: typeof parsed.mood === 'string' ? parsed.mood : 'neutral',
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.filter((t): t is string => typeof t === 'string')
          : [],
      }
    }
  } catch {
    // plain string body
  }
  return {
    v: SAFE_NOTES_PAYLOAD_VERSION,
    content: ciphertext,
    mood: 'neutral',
    tags: [],
  }
}
