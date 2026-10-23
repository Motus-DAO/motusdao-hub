import { NextRequest, NextResponse } from 'next/server'
import { assertAuthenticatedUser } from '@/lib/auth/guards'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { recordClinicalAccess } from '@/lib/clinical-audit'
import { loadSpeiHome, saveSpeiAccount } from '@/lib/spei-transfer'

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSession(request)
    const userId = assertAuthenticatedUser(actor)
    const home = await loadSpeiHome(userId)
    if (!home) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }
    return NextResponse.json(home)
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    console.error('[spei] read failed', error)
    return NextResponse.json({ error: 'No pudimos leer el pago por transferencia.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = await requireSession(request)
    const userId = assertAuthenticatedUser(actor)
    const result = await saveSpeiAccount(userId, await request.json())
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    await recordClinicalAccess({
      request,
      actorUserId: userId,
      targetUserId: userId,
      action: 'update',
      resource: 'payment',
      reason: 'spei_account_saved',
    })

    return NextResponse.json({ account: result.account })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    console.error('[spei] save account failed', error)
    return NextResponse.json({ error: 'No pudimos guardar la CLABE.' }, { status: 500 })
  }
}
