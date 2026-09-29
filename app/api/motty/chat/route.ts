import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError } from '@/lib/auth/errors'
import { assertAuthenticatedUser } from '@/lib/auth/guards'
import { requireSession } from '@/lib/auth/session'
import { runHubMottyTurn } from '@/lib/motty/agent-loop'
import { mottyConfig } from '@/lib/motty/config'
import {
  resolveMottyPageSurface,
  sanitizeMottyPagePath,
} from '@/lib/motty/page-context'
import { appendTurn, readMottySession, writeMottySession } from '@/lib/motty/session'
import type { MottyLocale } from '@/lib/motty/types'

export const runtime = 'nodejs'

const WINDOW_MS = 10 * 60 * 1000
const MAX_HITS = 40
const hits = new Map<string, { count: number; resetAt: number }>()

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request)
    const userId = assertAuthenticatedUser(auth)

    let body: { message?: unknown; locale?: unknown; pagePath?: unknown }
    try {
      body = (await request.json()) as {
        message?: unknown
        locale?: unknown
        pagePath?: unknown
      }
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    // Never accept userId / wallet / permissions from the client body.
    // pagePath is sanitized to a Hub pathname only (UI/prompt context).
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!message) {
      return NextResponse.json({ error: 'empty_message' }, { status: 400 })
    }

    const { maxMessageChars } = mottyConfig()
    if (message.length > maxMessageChars) {
      return NextResponse.json({ error: 'message_too_long' }, { status: 400 })
    }

    const locale: MottyLocale = body.locale === 'en' ? 'en' : 'es'
    const pagePath = sanitizeMottyPagePath(body.pagePath)
    const pageSurface = resolveMottyPageSurface(pagePath)
    const session = await readMottySession(userId, locale)

    if (rateLimited(`${userId}`)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }

    const turn = await runHubMottyTurn({
      session,
      userMessage: message,
      pageSurface,
      pagePath,
    })
    const next = appendTurn(turn.session, message, turn.reply)
    await writeMottySession(next)

    return NextResponse.json({
      reply: turn.reply,
      sessionId: next.id,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    const fallback =
      'No pude responder ahora. Intenta de nuevo en un momento.'
    return NextResponse.json({ reply: fallback, degraded: true })
  }
}

function rateLimited(key: string): boolean {
  const now = Date.now()
  const current = hits.get(key)
  if (!current || current.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  current.count += 1
  return current.count > MAX_HITS
}
