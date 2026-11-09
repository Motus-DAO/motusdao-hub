import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'

export type SessionRoleContext = {
  userId: string
  role: Role
  isPlatformAdmin: boolean
}

/** Server-side role from the database, not from the client store. */
export async function getSessionRoleContext(): Promise<SessionRoleContext | null> {
  const session = await getSession()
  if (!session?.userId) return null

  const user = await prisma.user.findFirst({
    where: { id: session.userId, deletedAt: null },
    select: { role: true, isPlatformAdmin: true },
  })
  if (!user) return null

  return {
    userId: session.userId,
    role: user.role,
    isPlatformAdmin: user.isPlatformAdmin === true,
  }
}

export function hasPsmAccess(context: SessionRoleContext | null): boolean {
  if (!context) return false
  return (
    context.role === 'psm' ||
    context.role === 'admin' ||
    context.isPlatformAdmin === true
  )
}

/**
 * Local-only escape hatch so a patient account can open the PSM pages while
 * testing the role switch. Production never bypasses: NODE_ENV must not be
 * production and the server-only ROLE_SWITCHER_DEV must be true.
 */
export function isRoleSwitcherDevBypass(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.ROLE_SWITCHER_DEV === 'true'
  )
}

/**
 * Server guard for /cobros, /disponibilidad and /pagos/sesiones. Writing the
 * URL must not be enough for a patient account.
 */
export async function requirePsmPage(): Promise<void> {
  if (isRoleSwitcherDevBypass()) return

  const context = await getSessionRoleContext()
  if (!context) redirect('/')
  if (!hasPsmAccess(context)) redirect('/finanzas')
}
