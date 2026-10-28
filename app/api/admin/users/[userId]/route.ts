import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth/admin-route'

/**
 * DELETE /api/admin/users/[userId]?mode=soft|hard
 * soft hides the row and keeps the wallet. hard removes the row so the wallet can register again.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const denied = await guardAdmin(request)
    if (denied) return denied

    const { userId } = await params
    const mode = new URL(request.url).searchParams.get('mode') ?? 'soft'
    if (mode !== 'soft' && mode !== 'hard') {
      return NextResponse.json(
        { error: 'Elige mode=soft o mode=hard' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if (user.role === 'admin' || user.isPlatformAdmin) {
      return NextResponse.json(
        { error: 'No se puede eliminar una cuenta de administrador' },
        { status: 403 }
      )
    }

    if (mode === 'hard') {
      await prisma.user.delete({ where: { id: userId } })
      return NextResponse.json({
        success: true,
        mode: 'hard',
        message: 'Usuario borrado. La wallet y el correo quedaron libres.',
      })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      mode: 'soft',
      message: 'Usuario oculto. La wallet y el correo siguen ocupados.',
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

