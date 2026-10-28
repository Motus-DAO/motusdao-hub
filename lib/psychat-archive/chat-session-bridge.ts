import type { PsychatArchiveMessage } from './payload'

const STORAGE_KEY = 'motus-psychat-pending-thread'

export function stashPsychatThreadForOpen(messages: PsychatArchiveMessage[]): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ messages, stashedAt: new Date().toISOString() })
  )
}

export function consumePsychatThreadForOpen(): PsychatArchiveMessage[] | null {
  if (typeof sessionStorage === 'undefined') return null
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  sessionStorage.removeItem(STORAGE_KEY)
  try {
    const parsed = JSON.parse(raw) as { messages?: PsychatArchiveMessage[] }
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) return null
    return parsed.messages.filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string'
    )
  } catch {
    return null
  }
}
