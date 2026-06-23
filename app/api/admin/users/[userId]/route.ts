import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth/admin-route'

/**
 * DELETE /api/admin/users/[userId]
 * Soft deletes a user by setting deletedAt timestamp (admin only)
 * This preserves all data and allows restoration, preventing issues with unique constraints
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const denied = await guardAdmin(request)
    if (denied) return denied

    const { userId } = await params

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userMatches: {
          select: { id: true }
        },
        psmMatches: {
          select: { id: true }
        },
        sessionsAsUser: {
          select: { id: true }
        },
        sessionsAsPSM: {
          select: { id: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: 'No se pueden eliminar usuarios administradores' },
        { status: 403 }
      )
    }

    // Soft delete: Mark user as deleted instead of actually deleting
    // This preserves the data and allows restoration if needed
    // Also prevents issues with unique constraints (privyId, email, eoaAddress, etc.)
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente (soft delete)'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users/[userId]/restore
 * Restores a soft-deleted user by setting deletedAt to null (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const denied = await guardAdmin(request)
    if (denied) return denied

    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Only allow restore action
    if (action !== 'restore') {
      return NextResponse.json(
        { error: 'Acción no válida. Use ?action=restore' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Check if user is actually deleted
    if (!user.deletedAt) {
      return NextResponse.json(
        { error: 'El usuario no está eliminado' },
        { status: 400 }
      )
    }

    // Restore the user
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          deletedAt: null,
          restoredAt: new Date() // Track when user was restored
        }
      })
    } catch (updateError) {
      console.error('Error updating user during restore:', updateError)
      // If restoredAt field doesn't exist, try without it
      if (updateError instanceof Error && updateError.message.includes('restoredAt')) {
        await prisma.user.update({
          where: { id: userId },
          data: { 
            deletedAt: null
          }
        })
      } else {
        throw updateError
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario restaurado exitosamente'
    })

  } catch (error) {
    console.error('Error restoring user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    )
  }
}

