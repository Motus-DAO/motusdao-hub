import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { mottyConfig } from '@/lib/motty/config'
import type { MottyLocale, MottyMessage, MottySession } from '@/lib/motty/types'

const SESSION_VERSION = 1

type CookiePayload = {
  v: number
  id: string
  userId: string
  locale: MottyLocale
  messages: MottyMessage[]
  createdAt: string
  updatedAt: string
}

export function createEmptySession(userId: string, locale: MottyLocale): MottySession {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    userId,
    locale,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

export async function readMottySession(
  userId: string,
  locale: MottyLocale
): Promise<MottySession> {
  const jar = await cookies()
  const raw = jar.get(mottyConfig().cookieName)?.value
  if (!raw) return createEmptySession(userId, locale)

  const parsed = decodeCookie(raw)
  if (!parsed || parsed.userId !== userId) {
    return createEmptySession(userId, locale)
  }

  return {
    ...parsed,
    userId,
    locale: parsed.locale === 'en' || parsed.locale === 'es' ? parsed.locale : locale,
    messages: capMessages(parsed.messages),
  }
}

export async function writeMottySession(session: MottySession): Promise<void> {
  const jar = await cookies()
  const next: MottySession = {
    ...session,
    messages: capMessages(session.messages),
    updatedAt: new Date().toISOString(),
  }
  const encoded = encodeCookie(next)
  const { cookieName, cookieMaxAgeSec } = mottyConfig()

  jar.set(cookieName, encoded, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: cookieMaxAgeSec,
  })
}

export function appendTurn(
  session: MottySession,
  user: string,
  assistant: string
): MottySession {
  return {
    ...session,
    messages: capMessages([
      ...session.messages,
      { role: 'user', content: user },
      { role: 'assistant', content: assistant },
    ]),
  }
}

function capMessages(messages: MottyMessage[]): MottyMessage[] {
  const { maxHistory, maxStoredChars } = mottyConfig()
  return messages.slice(-maxHistory).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content.slice(0, maxStoredChars),
  }))
}

function encodeCookie(session: MottySession): string {
  const payload: CookiePayload = {
    v: SESSION_VERSION,
    id: session.id,
    userId: session.userId,
    locale: session.locale,
    messages: session.messages,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = sign(body)
  return `${body}.${sig}`
}

function decodeCookie(raw: string): MottySession | null {
  const [body, sig] = raw.split('.')
  if (!body || !sig) return null
  if (!safeEqual(sign(body), sig)) return null

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as CookiePayload
    if (parsed.v !== SESSION_VERSION || !parsed.id || !parsed.userId) return null
    return {
      id: parsed.id,
      userId: parsed.userId,
      locale: parsed.locale === 'en' ? 'en' : 'es',
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

function sign(body: string): string {
  const secret = mottyConfig().sessionSecret || 'dev-only-motty-hub-secret'
  return createHmac('sha256', secret).update(body).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a)
    const right = Buffer.from(b)
    if (left.length !== right.length) return false
    return timingSafeEqual(left, right)
  } catch {
    return false
  }
}
