import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  assertSelfOrAdmin,
  assertSessionCanAccessUser,
  requireSelfOrAdmin,
} from '@/lib/auth/guards'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import {
  parseAuthIdentityFromSearchParams,
  authIdentityLookupConditions,
} from '@/lib/auth/identity'
import { recordClinicalAccess } from '@/lib/clinical-audit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, nombre, apellido, telefono, fechaNacimiento, ciudad, pais, avatarUrl, bio, language } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const session = await requireSelfOrAdmin(request, userId)

    // Create or update profile
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        nombre,
        apellido,
        telefono,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
        ciudad,
        pais,
        avatarUrl,
        bio,
        language: language || 'es'
      },
      create: {
        userId,
        nombre,
        apellido,
        telefono,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : new Date(),
        ciudad,
        pais,
        avatarUrl,
        bio,
        language: language || 'es'
      }
    })

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: userId,
      action: 'upsert',
      resource: 'profile',
      resourceId: profile.id,
      reason: 'profile_update',
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const emailParam = searchParams.get('email')
    const email =
      emailParam && emailParam.includes('@') ? emailParam : null
    const eoaParam = searchParams.get('eoaAddress')
    const identity = parseAuthIdentityFromSearchParams(searchParams)

    const userInclude = {
      profile: true,
      patient: true,
      psm: true,
    } as const

    // Prefer session-linked lookup, then explicit query params
    let user =
      session.userId != null
        ? await prisma.user.findUnique({
            where: { id: session.userId },
            include: userInclude,
          })
        : null

    if (!user && session.eoaAddress) {
      user = await prisma.user.findFirst({
        where: {
          deletedAt: null,
          eoaAddress: { equals: session.eoaAddress, mode: 'insensitive' },
        },
        include: userInclude,
      })
    }

    if (!user && userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: userInclude,
      })
    }

    if (!user && (email || identity.authProviderId || identity.legacyPrivyId || eoaParam)) {
      const identityConditions = authIdentityLookupConditions(identity)
      user = await prisma.user.findFirst({
        where: {
          deletedAt: null,
          OR: [
            ...(email ? [{ email }] : []),
            ...(eoaParam
              ? [
                  {
                    eoaAddress: {
                      equals: eoaParam,
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
            ...identityConditions,
          ],
        },
        include: userInclude,
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    assertSessionCanAccessUser(session, user)

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: user.id,
      action: 'read',
      resource: 'profile',
      resourceId: user.profile?.id ?? user.id,
      reason: 'profile_fetch',
    })

    if (!user.profile) {
      return NextResponse.json({
        profile: null,
        profileIncomplete: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          eoaAddress: user.eoaAddress,
          smartWalletAddress: user.smartWalletAddress,
          registrationCompleted: user.registrationCompleted,
          onboardingStatus: user.onboardingStatus,
          intakeSource: user.intakeSource,
          motusName: user.motusName,
          mnsTxHash: user.mnsTxHash,
          mnsRegisteredAt: user.mnsRegisteredAt,
          profileNftTxHash: user.profileNftTxHash,
          profileNftTokenURI: user.profileNftTokenURI,
          createdAt: user.createdAt
        },
        patientProfile: user.patient,
        psmProfile: user.psm
      })
    }

    return NextResponse.json({
      profile: user.profile,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        eoaAddress: user.eoaAddress,
        smartWalletAddress: user.smartWalletAddress,
        registrationCompleted: user.registrationCompleted,
        onboardingStatus: user.onboardingStatus,
        intakeSource: user.intakeSource,
        motusName: user.motusName,
        mnsTxHash: user.mnsTxHash,
        mnsRegisteredAt: user.mnsRegisteredAt,
        profileNftTxHash: user.profileNftTxHash,
        profileNftTokenURI: user.profileNftTokenURI,
        createdAt: user.createdAt
      },
      patientProfile: user.patient,
      psmProfile: user.psm
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, nombre, apellido, telefono, fechaNacimiento, ciudad, pais, avatarUrl, bio, language } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const session = await requireSelfOrAdmin(request, userId)

    // Update profile
    const profile = await prisma.profile.update({
      where: { userId },
      data: {
        nombre,
        apellido,
        telefono,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
        ciudad,
        pais,
        avatarUrl,
        bio,
        language: language || 'es'
      }
    })

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: userId,
      action: 'update',
      resource: 'profile',
      resourceId: profile.id,
      reason: 'profile_update',
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
