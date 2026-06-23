import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { guardAdmin } from '@/lib/auth/admin-route'

export async function GET(request: NextRequest) {
  try {
    const denied = await guardAdmin(request)
    if (denied) return denied

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.SessionWhereInput = {}
    
    if (status && ['requested', 'accepted', 'completed', 'cancelled'].includes(status)) {
      where.status = status as 'requested' | 'accepted' | 'completed' | 'cancelled'
    }

    // Get sessions with related data
    let sessions = await prisma.session.findMany({
      where,
      include: {
        user: {
          include: {
            profile: true,
            patient: true,
          }
        },
        psm: {
          include: {
            profile: true,
            psm: true,
          }
        },
        match: {
          select: {
            id: true,
            status: true,
            matchedAt: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
    })

    // Ensure sessions is an array
    if (!Array.isArray(sessions)) {
      sessions = []
    }

    // Apply search filter in memory if needed
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim()
      sessions = sessions.filter(session => {
        try {
          return (
            (session.user?.email && session.user.email.toLowerCase().includes(searchLower)) ||
            (session.psm?.email && session.psm.email.toLowerCase().includes(searchLower)) ||
            (session.user?.profile && (
              (session.user.profile.nombre && session.user.profile.nombre.toLowerCase().includes(searchLower)) ||
              (session.user.profile.apellido && session.user.profile.apellido.toLowerCase().includes(searchLower))
            )) ||
            (session.psm?.profile && (
              (session.psm.profile.nombre && session.psm.profile.nombre.toLowerCase().includes(searchLower)) ||
              (session.psm.profile.apellido && session.psm.profile.apellido.toLowerCase().includes(searchLower))
            )) ||
            (session.externalUrl && session.externalUrl.toLowerCase().includes(searchLower))
          )
        } catch (err) {
          console.error('Error filtering session:', err, session)
          return false
        }
      })
    }

    // Get total count
    const total = sessions.length

    // Apply pagination
    const paginatedSessions = sessions.slice(skip, skip + limit)

    // Format sessions data - convert dates to ISO strings for JSON serialization
    const formattedSessions = paginatedSessions.map(session => {
      try {
        return {
          id: session.id,
          userId: session.userId,
          psmId: session.psmId,
          matchId: session.matchId,
          status: session.status,
          mode: session.mode,
          externalUrl: session.externalUrl,
          requestedAt: session.requestedAt ? session.requestedAt.toISOString() : new Date().toISOString(),
          acceptedAt: session.acceptedAt ? session.acceptedAt.toISOString() : null,
          startedAt: session.startedAt ? session.startedAt.toISOString() : null,
          completedAt: session.completedAt ? session.completedAt.toISOString() : null,
          cancelledAt: session.cancelledAt ? session.cancelledAt.toISOString() : null,
          cancelReason: session.cancelReason || null,
          createdAt: session.createdAt ? session.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: session.updatedAt ? session.updatedAt.toISOString() : new Date().toISOString(),
          user: session.user ? {
            id: session.user.id,
            email: session.user.email || '',
            profile: session.user.profile ? {
              nombre: session.user.profile.nombre || '',
              apellido: session.user.profile.apellido || '',
              telefono: session.user.profile.telefono || '',
              ciudad: session.user.profile.ciudad || '',
              pais: session.user.profile.pais || '',
              avatarUrl: session.user.profile.avatarUrl || null,
            } : null,
            patient: session.user.patient ? {
              tipoAtencion: session.user.patient.tipoAtencion || '',
              problematica: session.user.patient.problematica || '',
            } : null,
          } : null,
          psm: session.psm ? {
            id: session.psm.id,
            email: session.psm.email || '',
            profile: session.psm.profile ? {
              nombre: session.psm.profile.nombre || '',
              apellido: session.psm.profile.apellido || '',
              telefono: session.psm.profile.telefono || '',
              ciudad: session.psm.profile.ciudad || '',
              pais: session.psm.profile.pais || '',
              avatarUrl: session.psm.profile.avatarUrl || null,
            } : null,
            psm: session.psm.psm ? {
              cedulaProfesional: session.psm.psm.cedulaProfesional || '',
              experienciaAnios: session.psm.psm.experienciaAnios || 0,
              especialidades: session.psm.psm.especialidades || '',
            } : null,
          } : null,
          match: session.match ? {
            id: session.match.id,
            status: session.match.status,
            matchedAt: session.match.matchedAt ? session.match.matchedAt.toISOString() : null,
          } : null,
        }
      } catch (err) {
        console.error('Error formatting session:', err, session)
        // Return a minimal safe session object
        return {
          id: session.id || '',
          userId: session.userId || '',
          psmId: session.psmId || '',
          matchId: session.matchId || null,
          status: session.status || 'requested',
          mode: session.mode || 'video_external',
          externalUrl: session.externalUrl || '',
          requestedAt: session.requestedAt ? session.requestedAt.toISOString() : new Date().toISOString(),
          acceptedAt: null,
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
          cancelReason: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: null,
          psm: null,
          match: null,
        }
      }
    })

    // Get stats
    const stats = {
      total: await prisma.session.count(),
      requested: await prisma.session.count({ where: { status: 'requested' } }),
      accepted: await prisma.session.count({ where: { status: 'accepted' } }),
      completed: await prisma.session.count({ where: { status: 'completed' } }),
      cancelled: await prisma.session.count({ where: { status: 'cancelled' } }),
    }

    return NextResponse.json({
      sessions: formattedSessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
      stats
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    )
  }
}

