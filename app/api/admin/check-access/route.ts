import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/admin-route'
import { getDevBypassAdminContext, isDevAdminBypassEnabled } from '@/lib/auth/dev-bypass'
import { getSessionFromRequest } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const denied = await guardAdmin(request)
    if (denied) return denied

    const session =
      (await getSessionFromRequest(request)) ??
      (isDevAdminBypassEnabled() ? getDevBypassAdminContext() : null)

    if (!session) {
      return NextResponse.json({ isAdmin: false }, { status: 401 })
    }

    return NextResponse.json({
      isAdmin: true,
      role: session!.role,
      userId: session!.userId,
      eoaAddress: session!.eoaAddress,
      authProvider: session!.authProvider,
    })
  } catch (error) {
    console.error('Error checking admin access:', error)
    return NextResponse.json(
      { isAdmin: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
