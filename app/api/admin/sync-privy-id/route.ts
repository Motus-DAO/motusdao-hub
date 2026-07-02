import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth/admin-route'
import {
  buildAuthIdentityUpdate,
  normalizeAuthIdentityBody,
} from '@/lib/auth/identity'

/**
 * POST /api/admin/sync-privy-id
 * Sync wallet vendor identity for an existing user by eoaAddress (admin only).
 * Legacy route name kept for scripts/docs.
 *
 * Body:
 * - { eoaAddress, authProvider, authProviderId } (preferred)
 * - { eoaAddress, privyId, authProvider? } (legacy)
 */
export async function POST(request: NextRequest) {
  try {
    const denied = await guardAdmin(request)
    if (denied) return denied

    const body = await request.json()
    const { eoaAddress } = body
    const identity = normalizeAuthIdentityBody({
      authProvider: body.authProvider,
      authProviderId: body.authProviderId ?? body.privyId,
      privyId: body.privyId,
    })

    if (!eoaAddress || !identity) {
      return NextResponse.json(
        { error: 'eoaAddress y authProviderId (o privyId legacy) son requeridos' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { eoaAddress },
      select: {
        id: true,
        email: true,
        role: true,
        privyId: true,
        authProvider: true,
        authProviderId: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if (identity.authProvider === 'privy') {
      const existingPrivyUser = await prisma.user.findUnique({
        where: { privyId: identity.authProviderId },
      })
      if (existingPrivyUser && existingPrivyUser.id !== user.id) {
        return NextResponse.json(
          { error: 'Este authProviderId ya está asignado a otro usuario' },
          { status: 409 }
        )
      }
    }

    const updatedUser = await prisma.user.update({
      where: { eoaAddress },
      data: buildAuthIdentityUpdate(identity),
    })

    return NextResponse.json({
      success: true,
      message: 'Identidad de wallet sincronizada exitosamente',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        authProvider: updatedUser.authProvider,
        authProviderId: updatedUser.authProviderId,
        privyId: updatedUser.privyId,
      },
    })
  } catch (error: unknown) {
    console.error('Error syncing wallet identity:', error)

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Este authProviderId ya está asignado a otro usuario' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
