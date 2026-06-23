import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const privyId = searchParams.get('privyId')
    const eoaAddress = searchParams.get('eoaAddress')
    const userId = searchParams.get('userId')

    if (!session?.userId && !email && !privyId && !eoaAddress && !userId) {
      return NextResponse.json(
        { error: 'Email, wallet address, user id, or session is required' },
        { status: 400 }
      )
    }

    const identityFilters = [
      session?.userId ? { id: session.userId } : null,
      userId ? { id: userId } : null,
      email ? { email } : null,
      privyId ? { privyId } : null,
      eoaAddress
        ? { eoaAddress: { equals: eoaAddress, mode: 'insensitive' as const } }
        : null,
      session?.eoaAddress && !eoaAddress
        ? {
            eoaAddress: {
              equals: session.eoaAddress,
              mode: 'insensitive' as const,
            },
          }
        : null,
    ].filter((condition): condition is NonNullable<typeof condition> => condition !== null)

    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: identityFilters,
      },
      select: {
        id: true,
        email: true,
        registrationCompleted: true,
        onboardingStatus: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json({
        registered: false,
        registrationCompleted: false,
      })
    }

    return NextResponse.json({
      registered: true,
      registrationCompleted: user.registrationCompleted,
      onboardingStatus: user.onboardingStatus,
      role: user.role,
      userId: user.id,
    })
  } catch (error) {
    console.error('Error checking registration:', error)
    const message =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
