import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { readActiveRole, allowedRolesFor, type ActiveRole } from '@/lib/auth/active-role'
import { isRoleSwitcherDevBypass } from '@/lib/auth/dev-role-switch'

export type SessionRoleContext = {
  userId: string
  /** Active role (signed cookie) or the DB role when there is no cookie. */
  role: Role
  dbRole: Role
  activeRole: ActiveRole | null
  allowedRoles: ActiveRole[]
  isPlatformAdmin: boolean
}

/** Server-side role from the database + the signed active-role cookie. */
export async function getSessionRoleContext(): Promise<SessionRoleContext | null> {
  const session = await getSession()
  if (!session?.userId) return null

  const user = await prisma.user.findFirst({
    where: { id: session.userId, deletedAt: null },
    select: { role: true, isPlatformAdmin: true },
  })
  if (!user) return null

  const allowedRoles = allowedRolesFor(user)
  const activeRole = await readActiveRole(session.userId)
  const role =
    activeRole && allowedRoles.includes(activeRole) ? activeRole : user.role

  return {
    userId: session.userId,
    role,
    dbRole: user.role,
    activeRole,
    allowedRoles,
    isPlatformAdmin: user.isPlatformAdmin === true,
  }
}

/**
 * A PSM page needs the ACTIVE role to be psm/admin. The platform-admin flag
 * only lets the account switch; it is not a bypass of the active role.
 */
export function hasPsmAccess(context: SessionRoleContext | null): boolean {
  if (!context) return false
  return context.role === 'psm' || context.role === 'admin'
}

/**
 * Server guard for /cobros, /disponibilidad, /pagos/sesiones and
 * /mis-usuarios. A patient with a direct URL is redirected.
 */
/** API counterpart of requirePsmPage: null means the active role is not PSM. */
export async function getActivePsmContext(): Promise<SessionRoleContext | null> {
  const context = await getSessionRoleContext()
  if (!context) return null
  if (isRoleSwitcherDevBypass()) return context
  return hasPsmAccess(context) ? context : null
}

export async function requirePsmPage(): Promise<void> {
  if (isRoleSwitcherDevBypass()) return

  const context = await getSessionRoleContext()
  if (!context) redirect('/')
  if (!hasPsmAccess(context)) redirect('/finanzas')
}
