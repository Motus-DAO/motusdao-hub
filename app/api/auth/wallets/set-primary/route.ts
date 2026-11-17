import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { handleAuthError, AuthError } from '@/lib/auth/errors'
import {
  sessionSignerBelongsToUser,
  setPrimaryLinkedWallet,
} from '@/lib/auth/linked-wallets'
import { verifySiweStepUp } from '@/lib/auth/siwe-step-up'
import { userHasAdminPrivileges } from '@/lib/auth/admin-access'

const setPrimarySchema = z.object({
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

    const body = setPrimarySchema.parse(await request.json())
    await verifySiweStepUp({
      message: body.message,
      signature: body.signature,
      expectedAddress: body.address,
    })

    const user = await prisma.user.findFirst({
      where: { id: session.userId, deletedAt: null },
      select: { registrationCompleted: true, role: true, isPlatformAdmin: true },
    })
    if (!user) {
      throw new AuthError(404, 'User not found')
    }

    await setPrimaryLinkedWallet({
      userId: session.userId,
      address: body.address,
      registrationCompleted: user.registrationCompleted,
      allowAdminOverride: userHasAdminPrivileges(user),
    })

    return NextResponse.json({ success: true, primaryAddress: body.address })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Set primary failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}