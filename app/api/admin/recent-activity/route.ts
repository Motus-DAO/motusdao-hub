import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
export async function GET() {
  try {
    // TEMPORAL: Autenticación deshabilitada para desarrollo
    // TODO: Re-habilitar antes de producción
    // const adminUser = await checkAdminAccess(request)
    // if (!adminUser) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    const limit = 10

    // Get recent activities from different sources
    // Note: restoredUsers query is wrapped in try-catch in case restoredAt field doesn't exist in DB
    const [recentUsers, deletedUsers, recentMatches, recentSessions, recentPayments, recentMessages] = await Promise.all([
      prisma.user.findMany({
        take: limit,
        where: { deletedAt: null }, // Only active users
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true
        }
      }),
      prisma.user.findMany({
        take: limit,
        where: { deletedAt: { not: null } }, // Only deleted users
        orderBy: { deletedAt: 'desc' },
        include: {
          profile: true
        }
      }),
      prisma.match.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { include: { profile: true } },
          psm: { include: { profile: true } }
        }
      }),
      prisma.session.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { include: { profile: true } },
          psm: { include: { profile: true } }
        }
      }),
      prisma.paymentLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fromUser: { include: { profile: true } }
        }
      }),
      prisma.contactMessage.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ])

    // Try to get restored users, but handle case where restoredAt field doesn't exist
    let restoredUsers: Array<{
      id: string
      email: string
      role: string
      restoredAt: Date | null
      createdAt: Date
      profile: { nombre: string; apellido: string } | null
    }> = []
    
    try {
      const restoredUsersResult = await prisma.user.findMany({
        take: limit,
        where: { 
          restoredAt: { not: null }, // Only restored users
          deletedAt: null // Must be currently active
        },
        orderBy: { restoredAt: 'desc' },
        include: {
          profile: true
        }
      })
      restoredUsers = restoredUsersResult
    } catch (error) {
      // If restoredAt field doesn't exist in database, just skip restored users
      // This can happen if migration hasn't been run yet
      console.warn('restoredAt field may not exist in database, skipping restored users:', error)
      restoredUsers = []
    }

    // Combine and format activities
    const activities = [
      ...recentUsers.map(user => ({
        id: `user-${user.id}`,
        type: 'user_registered' as const,
        title: 'Nuevo usuario registrado',
        description: user.profile
          ? `${user.profile.nombre} ${user.profile.apellido} (${user.email})`
          : user.email,
        timestamp: user.createdAt.toISOString(),
      })),
      ...deletedUsers.map(user => ({
        id: `user-deleted-${user.id}`,
        type: 'user_deleted' as const,
        title: 'Usuario eliminado',
        description: user.profile
          ? `${user.profile.nombre} ${user.profile.apellido} (${user.email})`
          : user.email,
        timestamp: user.deletedAt!.toISOString(), // deletedAt is guaranteed to be non-null here
      })),
      ...restoredUsers.map(user => ({
        id: `user-restored-${user.id}`,
        type: 'user_restored' as const,
        title: user.role === 'psm' ? 'Profesional (PSM) restaurado' : 'Usuario restaurado',
        description: user.profile
          ? `${user.profile.nombre} ${user.profile.apellido} (${user.email})`
          : user.email,
        timestamp: user.restoredAt!.toISOString(), // restoredAt is guaranteed to be non-null here
      })),
      ...recentMatches.map(match => ({
        id: `match-${match.id}`,
        type: 'match_created' as const,
        title: 'Nuevo match creado',
        description: `${match.user.profile?.nombre || 'Usuario'} emparejado con ${match.psm.profile?.nombre || 'PSM'}`,
        timestamp: match.createdAt.toISOString(),
      })),
      ...recentSessions.map(session => ({
        id: `session-${session.id}`,
        type: 'session_created' as const,
        title: 'Nueva sesión creada',
        description: `Sesión entre ${session.user.profile?.nombre || 'Usuario'} y ${session.psm.profile?.nombre || 'PSM'}`,
        timestamp: session.createdAt.toISOString(),
      })),
      ...recentPayments.map(payment => ({
        id: `payment-${payment.id}`,
        type: 'payment' as const,
        title: 'Nuevo pago registrado',
        description: `${payment.fromUser.profile?.nombre || 'Usuario'} - ${payment.amount} ${payment.currency}`,
        timestamp: payment.createdAt.toISOString(),
      })),
      ...recentMessages.map(message => ({
        id: `message-${message.id}`,
        type: 'message' as const,
        title: 'Nuevo mensaje de contacto',
        description: `De ${message.name} (${message.email})`,
        timestamp: message.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return NextResponse.json({
      activities
    })
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

