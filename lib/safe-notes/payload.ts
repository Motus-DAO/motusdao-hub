import { SAFE_NOTES_PAYLOAD_VERSION } from './constants'
import {
  normalizeBitacoraKind,
  type BitacoraEntryKind,
} from './entry-types'

export type SafeNotesPayload = {
  v: typeof SAFE_NOTES_PAYLOAD_VERSION
  kind: BitacoraEntryKind
  title?: string
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
  const mood = typeof parsed.mood === 'string' ? parsed.mood : 'neutral'
  const kind = normalizeBitacoraKind(
    (parsed as { kind?: unknown }).kind,
    mood
  )
  const titleRaw = (parsed as { title?: unknown }).title
  const title =
    typeof titleRaw === 'string' && titleRaw.trim() ? titleRaw.trim() : undefined
  return {
    v: SAFE_NOTES_PAYLOAD_VERSION,
    kind,
    title,
    content: parsed.content,
    mood,
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
      const mood = typeof parsed.mood === 'string' ? parsed.mood : 'neutral'
      return {
        v: SAFE_NOTES_PAYLOAD_VERSION,
        kind: normalizeBitacoraKind(
          (parsed as { kind?: unknown }).kind,
          mood
        ),
        content: parsed.content,
        mood,
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
    kind: 'nota',
    content: ciphertext,
    mood: 'neutral',
    tags: [],
  }
}
