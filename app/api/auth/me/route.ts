import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest, handleAuthError } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      userId: session.userId,
      eoaAddress: session.eoaAddress,
      role: session.role,
      authProvider: session.authProvider,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('[auth/me] Error:', error)
    return NextResponse.json(
      { error: 'Failed to read session' },
      { status: 500 }
    )
  }
}
