import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { consumeAuthNonce } from '@/lib/auth/nonce'
import {
  createSessionToken,
  getRequestDomain,
  getSessionCookieOptions,
  type SessionPayload,
} from '@/lib/auth/session'
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants'
import { handleAuthError, AuthError } from '@/lib/auth/errors'
import { verifySiweLogin } from '@/lib/auth/verify-siwe'
import { buildAuthIdentityUpdate } from '@/lib/auth/identity'

const verifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
  authProvider: z.enum(['waap', 'privy', 'external']).optional(),
  authProviderId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = verifySchema.parse(await request.json())
    const domain = getRequestDomain(request)

    const { address, nonce } = await verifySiweLogin({
      message: body.message,
      signature: body.signature,
      domain,
    })

    const nonceValid = await consumeAuthNonce(address, nonce)
    if (!nonceValid) {
      throw new AuthError(401, 'Invalid or expired nonce')
    }

    const user = await prisma.user.findFirst({
      where: {
        eoaAddress: { equals: address, mode: 'insensitive' },
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
        authProvider: true,
        authProviderId: true,
      },
    })

    if (
      user &&
      body.authProvider &&
      body.authProviderId &&
      (body.authProvider !== user.authProvider ||
        body.authProviderId !== user.authProviderId)
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: buildAuthIdentityUpdate({
          authProvider: body.authProvider,
          authProviderId: body.authProviderId,
        }),
      })
    }

    const sessionPayload: SessionPayload = {
      sub: user?.id ?? null,
      eoa: address.toLowerCase(),
      role: user?.role ?? null,
      authProvider: body.authProvider ?? user?.authProvider ?? null,
    }

    const token = createSessionToken(sessionPayload)
    const response = NextResponse.json({
      success: true,
      userId: user?.id ?? null,
      eoaAddress: address,
      role: user?.role ?? null,
      registered: Boolean(user),
    })

    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions())
    return response
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 }
      )
    }

    const message =
      error instanceof Error ? error.message : 'Authentication verification failed'
    console.error('[auth/verify] Error:', error)
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
