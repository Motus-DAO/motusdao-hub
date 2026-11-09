import { NextRequest, NextResponse } from 'next/server'
import { handleAuthError } from '@/lib/auth/session'
import { getActivePsmContext, getSessionRoleContext } from '@/lib/auth/role-guards'
import { recordClinicalAccess } from '@/lib/clinical-audit'
import { loadSpeiHome, saveSpeiAccount } from '@/lib/spei-transfer'

export async function GET() {
  try {
    const context = await getSessionRoleContext()
    if (!context) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const home = await loadSpeiHome(context.userId, context.role)
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
    const context = await getActivePsmContext()
    if (!context) {
      return NextResponse.json(
        { error: 'Solo un profesional puede editar su CLABE.' },
        { status: 403 }
      )
    }
    const result = await saveSpeiAccount(context.userId, await request.json(), context.role)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    await recordClinicalAccess({
      request,
      actorUserId: context.userId,
      targetUserId: context.userId,
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
