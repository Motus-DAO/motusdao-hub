import { NextRequest, NextResponse } from 'next/server'
import { assertAuthenticatedUser } from '@/lib/auth/guards'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { recordClinicalAccess } from '@/lib/clinical-audit'
import { recordTransferAction } from '@/lib/spei-transfer'

type RouteParams = { params: Promise<{ sessionId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const actor = await requireSession(request)
    const userId = assertAuthenticatedUser(actor)
    const { sessionId } = await params
    const result = await recordTransferAction(userId, sessionId, await request.json())
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    await recordClinicalAccess({
      request,
      actorUserId: userId,
      targetUserId: result.targetUserId,
      action: 'update',
      resource: 'payment',
      resourceId: result.eventId,
      reason: result.kind,
      metadata: { sessionId },
    })

    return NextResponse.json({ ok: true }, { status: result.status })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    console.error('[spei] transfer event failed', error)
    return NextResponse.json({ error: 'No pudimos registrar el pago.' }, { status: 500 })
  }
}
