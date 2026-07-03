import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  createSessionToken,
  getSessionCookieOptions,
  type SessionPayload,
} from '@/lib/auth/session'
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants'
import {
  getDefaultDevTestLoginEmail,
  isDevTestLoginEnabled,
  type DevTestLoginUser,
} from '@/lib/auth/dev-test-login'

const bodySchema = z.object({
  email: z.string().email().optional(),
})

export async function GET() {
  if (!isDevTestLoginEnabled()) {
    return NextResponse.json({ enabled: false })
  }

  const defaultEmail = getDefaultDevTestLoginEmail()
  const presets = await prisma.user.findMany({
    where: {
      deletedAt: null,
      registrationCompleted: true,
      OR: [
        { email: { endsWith: '@motusdao.com', mode: 'insensitive' } },
        { email: { endsWith: '@motusdao.local', mode: 'insensitive' } },
      ],
    },
    select: { email: true, role: true },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  const recent = await prisma.user.findMany({
    where: { deletedAt: null, registrationCompleted: true },
    select: { email: true, role: true },
    orderBy: { updatedAt: 'desc' },
    take: 4,
  })

  const options = [...presets, ...recent].filter(
    (item, index, list) =>
      item.email &&
      list.findIndex((other) => other.email === item.email) === index
  )

  return NextResponse.json({
    enabled: true,
    defaultEmail,
    options,
  })
}

export async function POST(request: NextRequest) {
  if (!isDevTestLoginEnabled()) {
    return NextResponse.json({ error: 'Dev test login is disabled' }, { status: 403 })
  }

  const body = bodySchema.parse(await request.json().catch(() => ({})))
  const email = body.email ?? getDefaultDevTestLoginEmail()

  if (!email) {
    return NextResponse.json(
      { error: 'Provide email in request body or set DEV_TEST_LOGIN_EMAIL' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      email: { equals: email, mode: 'insensitive' },
    },
    select: {
      id: true,
      email: true,
      eoaAddress: true,
      role: true,
      authProvider: true,
      authProviderId: true,
    },
  })

  if (!user?.eoaAddress) {
    return NextResponse.json(
      { error: `No active user with wallet found for ${email}` },
      { status: 404 }
    )
  }

  const sessionPayload: SessionPayload = {
    sub: user.id,
    eoa: user.eoaAddress.toLowerCase(),
    role: user.role,
    authProvider: user.authProvider,
  }

  const payload: DevTestLoginUser = {
    userId: user.id,
    email: user.email,
    eoaAddress: user.eoaAddress,
    role: user.role,
    authProvider: user.authProvider,
    authProviderId: user.authProviderId,
  }

  const token = createSessionToken(sessionPayload)
  const response = NextResponse.json({ success: true, user: payload })
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions())
  return response
}
