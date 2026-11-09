import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import {
  ACTIVE_ROLE_COOKIE,
  activeRoleCookieOptions,
  allowedRolesFor,
  readActiveRole,
  signActiveRole,
  type ActiveRole,
} from '@/lib/auth/active-role'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  role: z.enum(['usuario', 'psm', 'admin']),
})

async function loadUser(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { role: true, isPlatformAdmin: true },
  })
}

/**
 * GET /api/auth/active-role
 * Returns the signed active role (or the DB role when no cookie is set), the
 * roles this account may hold, and the admin flag.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await loadUser(session.userId)
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const allowedRoles = allowedRolesFor(user)
    const cookieRole = await readActiveRole(session.userId)
    const activeRole: ActiveRole =
      cookieRole && allowedRoles.includes(cookieRole) ? cookieRole : user.role

    return NextResponse.json({
      activeRole,
      allowedRoles,
      dbRole: user.role,
      isPlatformAdmin: user.isPlatformAdmin === true,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    console.error('[auth/active-role] GET', error)
    return NextResponse.json(
      { error: 'No se pudo leer el rol activo.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/active-role
 * Sets the signed, httpOnly active-role cookie. The server checks the role
 * against the DB before writing it; a patient cannot choose psm or admin.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = bodySchema.parse(await request.json())
    const user = await loadUser(session.userId)
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const allowedRoles = allowedRolesFor(user)
    if (!allowedRoles.includes(body.role)) {
      return NextResponse.json(
        { error: 'Tu cuenta no tiene ese rol.' },
        { status: 403 }
      )
    }

    const token = signActiveRole(session.userId, body.role)
    const response = NextResponse.json({
      success: true,
      activeRole: body.role,
      allowedRoles,
    })
    response.cookies.set(ACTIVE_ROLE_COOKIE, token, activeRoleCookieOptions())
    return response
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }
    console.error('[auth/active-role] POST', error)
    return NextResponse.json(
      { error: 'No se pudo cambiar el rol.' },
      { status: 500 }
    )
  }
}
