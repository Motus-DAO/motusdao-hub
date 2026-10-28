import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { AuthProvider, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  SESSION_COOKIE_NAME,
  SESSION_IDLE_MAX_SECONDS,
  SESSION_MAX_AGE_SECONDS,
  SESSION_SLIDE_MIN_SECONDS,
} from './constants'
import { AuthError } from './errors'
import {
  getDevBypassAdminContext,
  isDevAdminBypassEnabled,
} from './dev-bypass'
import { userHasAdminPrivileges } from './admin-access'

export type SessionPayload = {
  sub: string | null
  eoa: string
  role: Role | null
  isPlatformAdmin?: boolean
  authProvider?: AuthProvider | null
  lastActiveAt?: number
}

export type AuthContext = {
  userId: string | null
  eoaAddress: string
  role: Role | null
  isPlatformAdmin: boolean
  authProvider: AuthProvider | null
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET environment variable is required in production')
  }
  return secret || 'dev-only-insecure-auth-secret'
}

export function getRequestOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }

  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    'localhost:3000'
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (host.includes('localhost') ? 'http' : 'https')

  return `${proto}://${host}`
}

export function getRequestDomain(request: NextRequest): string {
  const origin = getRequestOrigin(request)
  return new URL(origin).host
}

export function isSessionIdleExpired(
  lastActiveAt: number,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!lastActiveAt) return false
  return nowSeconds - lastActiveAt > SESSION_IDLE_MAX_SECONDS
}

function payloadFromVerifiedToken(
  verified: jwt.JwtPayload & SessionPayload
): SessionPayload | null {
  if (!verified.eoa) return null

  const lastActiveAt = verified.lastActiveAt ?? verified.iat ?? 0
  if (isSessionIdleExpired(lastActiveAt)) {
    return null
  }

  return {
    sub: verified.sub ?? null,
    eoa: verified.eoa.toLowerCase(),
    role: (verified.role as Role | null) ?? null,
    isPlatformAdmin: verified.isPlatformAdmin === true,
    authProvider: (verified.authProvider as AuthProvider | null) ?? null,
    lastActiveAt,
  }
}

function decodeSessionToken(token: string): SessionPayload | null {
  try {
    const verified = jwt.verify(token, getAuthSecret()) as jwt.JwtPayload &
      SessionPayload
    return payloadFromVerifiedToken(verified)
  } catch {
    return null
  }
}

function toAuthContext(payload: SessionPayload): AuthContext {
  return {
    userId: payload.sub,
    eoaAddress: payload.eoa,
    role: payload.role,
    isPlatformAdmin: payload.isPlatformAdmin === true,
    authProvider: payload.authProvider ?? null,
  }
}

export function createSessionToken(payload: SessionPayload): string {
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign(
    {
      ...payload,
      lastActiveAt: now,
    },
    getAuthSecret(),
    {
      expiresIn: SESSION_MAX_AGE_SECONDS,
    }
  )
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}

async function slideSessionActivity(payload: SessionPayload): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  const last = payload.lastActiveAt ?? 0
  if (now - last < SESSION_SLIDE_MIN_SECONDS) {
    return
  }

  const cookieStore = await cookies()
  const refreshed = createSessionToken(payload)
  cookieStore.set(SESSION_COOKIE_NAME, refreshed, getSessionCookieOptions())
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<AuthContext | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  const payload = decodeSessionToken(token)
  if (!payload) return null

  return toAuthContext(payload)
}

export async function getSession(): Promise<AuthContext | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  const payload = decodeSessionToken(token)
  if (!payload) return null

  return toAuthContext(payload)
}

export async function requireSession(
  request: NextRequest
): Promise<AuthContext> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    throw new AuthError(401, 'Authentication required')
  }

  const payload = decodeSessionToken(token)
  if (!payload) {
    throw new AuthError(401, 'Authentication required')
  }

  await slideSessionActivity(payload)
  return toAuthContext(payload)
}

export async function requireAdmin(
  request: NextRequest
): Promise<AuthContext> {
  if (isDevAdminBypassEnabled()) {
    return getDevBypassAdminContext()
  }

  const session = await requireSession(request)
  if (!session.userId) {
    throw new AuthError(403, 'Admin access required')
  }

  const user = await prisma.user.findFirst({
    where: { id: session.userId, deletedAt: null },
    select: { role: true, isPlatformAdmin: true },
  })

  if (!userHasAdminPrivileges(user)) {
    throw new AuthError(403, 'Admin access required')
  }

  return {
    ...session,
    role: user!.role,
    isPlatformAdmin: user!.isPlatformAdmin === true,
  }
}

export { handleAuthError } from './errors'
