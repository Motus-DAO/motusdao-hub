import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { recordClinicalAccess } from '@/lib/clinical-audit'
import {
  resolveProfileSessionAccess,
  UNLINKED_WALLET_CODE,
} from '@/lib/auth/hub-session'

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

function toHubSessionSnapshot(session: {
  userId: string | null
  eoaAddress: string
}) {
  return {
    authenticated: true,
    userId: session.userId,
    eoaAddress: session.eoaAddress,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    const access = resolveProfileSessionAccess(toHubSessionSnapshot(session))

    if (access.status === 'unlinked') {
      return NextResponse.json(
        {
          error: 'Authenticated user is not linked to an app profile',
          code: UNLINKED_WALLET_CODE,
        },
        { status: 401 }
      )
    }

    if (access.status !== 'ok') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userInclude = {
      profile: true,
      patient: true,
      psm: true,
    } as const

    const user = await prisma.user.findFirst({
      where: {
        id: access.userId,
        deletedAt: null,
      },
      include: userInclude,
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

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
