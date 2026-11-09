import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import type { Role } from '@prisma/client'
import { getAuthSecret } from './session'
import { isRoleSwitcherDevBypass } from './dev-role-switch'

export const ACTIVE_ROLE_COOKIE = 'motus_active_role'
const ACTIVE_ROLE_PURPOSE = 'active-role'
const ACTIVE_ROLE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export type ActiveRole = Extract<Role, 'usuario' | 'psm' | 'admin'>

const ROLES: ActiveRole[] = ['usuario', 'psm', 'admin']

export function isActiveRole(value: unknown): value is ActiveRole {
  return typeof value === 'string' && ROLES.includes(value as ActiveRole)
}

/**
 * The database decides which roles an account may hold. A platform admin can
 * switch between all three; a professional only between their professional
 * role; a patient only their patient role. The dev bypass is local-only.
 */
export function allowedRolesFor(user: {
  role: Role
  isPlatformAdmin: boolean
}): ActiveRole[] {
  if (isRoleSwitcherDevBypass()) return [...ROLES]
  if (user.role === 'admin' || user.isPlatformAdmin) return [...ROLES]
  if (user.role === 'psm') return ['psm']
  return ['usuario']
}

export function signActiveRole(userId: string, role: ActiveRole): string {
  return jwt.sign(
    { sub: userId, role, purpose: ACTIVE_ROLE_PURPOSE },
    getAuthSecret(),
    { expiresIn: ACTIVE_ROLE_MAX_AGE_SECONDS }
  )
}

export function verifyActiveRole(
  token: string,
  userId: string
): ActiveRole | null {
  try {
    const payload = jwt.verify(token, getAuthSecret()) as jwt.JwtPayload & {
      sub?: string
      role?: unknown
      purpose?: string
    }
    if (payload.purpose !== ACTIVE_ROLE_PURPOSE) return null
    if (payload.sub !== userId) return null
    return isActiveRole(payload.role) ? payload.role : null
  } catch {
    return null
  }
}

/** Reads the signed active-role cookie; null means "use the DB role". */
export async function readActiveRole(userId: string): Promise<ActiveRole | null> {
  const store = await cookies()
  const token = store.get(ACTIVE_ROLE_COOKIE)?.value
  if (!token) return null
  return verifyActiveRole(token, userId)
}

export function activeRoleCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ACTIVE_ROLE_MAX_AGE_SECONDS,
  }
}
