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

    // Get date ranges
    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const weekStart = new Date(now.setDate(now.getDate() - 7))
    const monthStart = new Date(now.setDate(now.getDate() - 30))
    const lastMonthStart = new Date(now.setDate(now.getDate() - 60))

    // Parallel queries for better performance
    const [
      totalUsers,
      totalPSM,
      totalAdmins,
      activeMatches,
      sessionsToday,
      sessionsThisWeek,
      sessionsThisMonth,
      totalPayments,
      paymentLogs,
      publishedCourses,
      totalEnrollments,
      unreadMessages,
      usersLastMonth,
      matchesLastMonth,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'usuario', deletedAt: null } }),
      prisma.user.count({ where: { role: 'psm', deletedAt: null } }),
      prisma.user.count({ where: { role: 'admin', deletedAt: null } }),
      prisma.match.count({ where: { status: 'active' } }),
      prisma.session.count({
        where: {
          createdAt: { gte: todayStart }
        }
      }),
      prisma.session.count({
        where: {
          createdAt: { gte: weekStart }
        }
      }),
      prisma.session.count({
        where: {
          createdAt: { gte: monthStart }
        }
      }),
      prisma.paymentLog.count(),
      prisma.paymentLog.findMany({
        select: {
          amount: true,
          currency: true
        }
      }),
      prisma.course.count({ where: { isPublished: true } }),
      prisma.enrollment.count(),
      prisma.contactMessage.count(),
      prisma.user.count({
        where: {
          role: 'usuario',
          deletedAt: null,
          createdAt: {
            gte: lastMonthStart,
            lt: monthStart
          }
        }
      }),
      prisma.match.count({
        where: {
          createdAt: {
            gte: lastMonthStart,
            lt: monthStart
          }
        }
      }),
    ])

    // Calculate revenue (sum of all payments)
    const totalRevenue = paymentLogs.reduce((sum, log) => {
      try {
        const amount = parseFloat(log.amount) || 0
        return sum + amount
      } catch {
        return sum
      }
    }, 0)

    // Calculate growth percentages
    const usersThisMonth = await prisma.user.count({
      where: {
        role: 'usuario',
        deletedAt: null,
        createdAt: { gte: monthStart }
      }
    })

    const matchesThisMonth = await prisma.match.count({
      where: {
        createdAt: { gte: monthStart }
      }
    })

    const usersGrowth = usersLastMonth > 0
      ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100)
      : usersThisMonth > 0 ? 100 : 0

    const matchesGrowth = matchesLastMonth > 0
      ? Math.round(((matchesThisMonth - matchesLastMonth) / matchesLastMonth) * 100)
      : matchesThisMonth > 0 ? 100 : 0

    // Format revenue
    const formattedRevenue = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(totalRevenue)

    return NextResponse.json({
      totalUsers,
      totalPSM,
      totalAdmins,
      activeMatches,
      sessionsToday,
      sessionsThisWeek,
      sessionsThisMonth,
      totalPayments,
      totalRevenue: formattedRevenue,
      publishedCourses,
      totalEnrollments,
      unreadMessages,
      usersGrowth,
      matchesGrowth,
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

