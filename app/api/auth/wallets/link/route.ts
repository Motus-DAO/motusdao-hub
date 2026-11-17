import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/auth/session'
import { handleAuthError, AuthError } from '@/lib/auth/errors'
import { linkWalletToUser, sessionSignerBelongsToUser } from '@/lib/auth/linked-wallets'
import { verifySiweStepUp } from '@/lib/auth/siwe-step-up'

const linkSchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
  label: z.string().max(64).optional(),
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

    const body = linkSchema.parse(await request.json())
    const linkedAddress = await verifySiweStepUp({
      message: body.message,
      signature: body.signature,
    })

    const wallet = await linkWalletToUser({
      userId: session.userId,
      address: linkedAddress,
      label: body.label,
    })

    return NextResponse.json({ success: true, wallet })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Link failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}