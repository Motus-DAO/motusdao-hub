import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth/admin-route'

/**
 * POST /api/admin/sync-privy-id
 * Sync auth provider id for an existing user by eoaAddress (admin only).
 * Legacy name kept for backward compatibility with scripts/docs.
 *
 * Body: { eoaAddress: string, privyId: string, authProvider?: 'waap' | 'privy' | 'external' }
 */
export async function POST(request: NextRequest) {
  try {
    const denied = await guardAdmin(request)
    if (denied) return denied

    const body = await request.json()
    const { eoaAddress, privyId, authProvider } = body

    if (!eoaAddress || !privyId) {
      return NextResponse.json(
        { error: 'eoaAddress y privyId son requeridos' },
        { status: 400 }
      )
    }

    // Buscar usuario por eoaAddress
    const user = await prisma.user.findUnique({
      where: { eoaAddress },
      select: { id: true, email: true, role: true, privyId: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Si ya tiene privyId y es diferente, verificar que no esté en uso
    if (user.privyId && user.privyId !== privyId) {
      const existingUserWithPrivyId = await prisma.user.findUnique({
        where: { privyId }
      })

      if (existingUserWithPrivyId && existingUserWithPrivyId.id !== user.id) {
        return NextResponse.json(
          { error: 'Este privyId ya está asignado a otro usuario' },
          { status: 409 }
        )
      }
    }

    // Actualizar privyId
    const updatedUser = await prisma.user.update({
      where: { eoaAddress },
      data: {
        privyId,
        authProviderId: privyId,
        ...(authProvider ? { authProvider } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'PrivyId sincronizado exitosamente',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        privyId: updatedUser.privyId
      }
    })
  } catch (error: unknown) {
    console.error('Error syncing privyId:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Este privyId ya está asignado a otro usuario' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

