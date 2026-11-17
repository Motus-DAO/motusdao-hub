import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/auth/session'
import { handleAuthError, AuthError } from '@/lib/auth/errors'
import {
  sessionSignerBelongsToUser,
  unlinkWalletFromUser,
} from '@/lib/auth/linked-wallets'
import { verifySiweStepUp } from '@/lib/auth/siwe-step-up'

const unlinkSchema = z.object({
  address: z.string().min(1),
  message: z.string().min(1),
  signature: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      throw new AuthError(403, 'Registration required')
    }

    const belongs = await sessionSignerBelongsToUser(
      session.userId,
      session.eoaAddress
    )
    if (!belongs) {
      throw new AuthError(403, 'La sesión no coincide con tu wallet activa')
    }

    const body = unlinkSchema.parse(await request.json())
    await verifySiweStepUp({
      message: body.message,
      signature: body.signature,
      expectedAddress: body.address,
    })

    await unlinkWalletFromUser({
      userId: session.userId,
      address: body.address,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Unlink failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}