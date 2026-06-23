import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { AuthProvider, Role } from '@prisma/client'
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from './constants'
import { AuthError } from './errors'

export type SessionPayload = {
  sub: string | null
  eoa: string
  role: Role | null
  authProvider?: AuthProvider | null
}

export type AuthContext = {
  userId: string | null
  eoaAddress: string
  role: Role | null
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

function decodeSessionToken(token: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, getAuthSecret()) as SessionPayload
    if (!payload.eoa) return null
    return {
      sub: payload.sub ?? null,
      eoa: payload.eoa.toLowerCase(),
      role: payload.role ?? null,
      authProvider: payload.authProvider ?? null,
    }
  } catch {
    return null
  }
}

export function createSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, getAuthSecret(), {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  })
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

export async function getSessionFromRequest(
  request: NextRequest
): Promise<AuthContext | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  const payload = decodeSessionToken(token)
  if (!payload) return null

  return {
    userId: payload.sub,
    eoaAddress: payload.eoa,
    role: payload.role,
    authProvider: payload.authProvider ?? null,
  }
}

export async function getSession(): Promise<AuthContext | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  const payload = decodeSessionToken(token)
  if (!payload) return null

  return {
    userId: payload.sub,
    eoaAddress: payload.eoa,
    role: payload.role,
    authProvider: payload.authProvider ?? null,
  }
}

export async function requireSession(
  request: NextRequest
): Promise<AuthContext> {
  const session = await getSessionFromRequest(request)
  if (!session) {
    throw new AuthError(401, 'Authentication required')
  }
  return session
}

export async function requireAdmin(
  request: NextRequest
): Promise<AuthContext> {
  const session = await requireSession(request)
  if (!session.userId || session.role !== 'admin') {
    throw new AuthError(403, 'Admin access required')
  }
  return session
}

export { handleAuthError } from './errors'
