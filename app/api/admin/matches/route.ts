import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // Build where clause (filter by match status)
    const where: { status?: 'active' | 'paused' | 'ended' } = {}
    
    if (status && ['active', 'paused', 'ended'].includes(status)) {
      where.status = status as 'active' | 'paused' | 'ended'
    }

    // Get matches with related data
    let matches = await prisma.match.findMany({
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
        sessions: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        matchedAt: 'desc'
      },
    })

    // Ensure matches is an array
    if (!Array.isArray(matches)) {
      matches = []
    }

    // Apply search filter in memory if needed
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim()
      matches = matches.filter(match => {
        try {
          return (
            (match.user?.email && match.user.email.toLowerCase().includes(searchLower)) ||
            (match.psm?.email && match.psm.email.toLowerCase().includes(searchLower)) ||
            (match.user?.profile && (
              (match.user.profile.nombre && match.user.profile.nombre.toLowerCase().includes(searchLower)) ||
              (match.user.profile.apellido && match.user.profile.apellido.toLowerCase().includes(searchLower))
            )) ||
            (match.psm?.profile && (
              (match.psm.profile.nombre && match.psm.profile.nombre.toLowerCase().includes(searchLower)) ||
              (match.psm.profile.apellido && match.psm.profile.apellido.toLowerCase().includes(searchLower))
            ))
          )
        } catch (err) {
          console.error('Error filtering match:', err, match)
          return false
        }
      })
    }

    // Get total count
    const total = matches.length

    // Apply pagination
    const paginatedMatches = matches.slice(skip, skip + limit)

    // Format matches data - convert dates to ISO strings for JSON serialization
    const formattedMatches = paginatedMatches.map(match => {
      try {
        const completedSessions = match.sessions.filter(s => s.status === 'completed').length
        const totalSessions = match.sessions.length

        return {
          id: match.id,
          userId: match.userId,
          psmId: match.psmId,
          status: match.status,
          matchedAt: match.matchedAt ? match.matchedAt.toISOString() : new Date().toISOString(),
          endedAt: match.endedAt ? match.endedAt.toISOString() : null,
          reason: match.reason || null,
          createdAt: match.createdAt ? match.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: match.updatedAt ? match.updatedAt.toISOString() : new Date().toISOString(),
          user: match.user ? {
            id: match.user.id,
            email: match.user.email || '',
            profile: match.user.profile ? {
              nombre: match.user.profile.nombre || '',
              apellido: match.user.profile.apellido || '',
              telefono: match.user.profile.telefono || '',
              ciudad: match.user.profile.ciudad || '',
              pais: match.user.profile.pais || '',
              avatarUrl: match.user.profile.avatarUrl || null,
            } : null,
            patient: match.user.patient ? {
              tipoAtencion: match.user.patient.tipoAtencion || '',
              problematica: match.user.patient.problematica || '',
            } : null,
          } : null,
          psm: match.psm ? {
            id: match.psm.id,
            email: match.psm.email || '',
            profile: match.psm.profile ? {
              nombre: match.psm.profile.nombre || '',
              apellido: match.psm.profile.apellido || '',
              telefono: match.psm.profile.telefono || '',
              ciudad: match.psm.profile.ciudad || '',
              pais: match.psm.profile.pais || '',
              avatarUrl: match.psm.profile.avatarUrl || null,
            } : null,
            psm: match.psm.psm ? {
              cedulaProfesional: match.psm.psm.cedulaProfesional || '',
              experienciaAnios: match.psm.psm.experienciaAnios || 0,
              especialidades: match.psm.psm.especialidades || '',
            } : null,
          } : null,
          sessions: {
            total: totalSessions,
            completed: completedSessions,
            list: match.sessions.map(s => ({
              id: s.id,
              status: s.status,
              createdAt: s.createdAt ? s.createdAt.toISOString() : null,
              completedAt: s.completedAt ? s.completedAt.toISOString() : null,
            }))
          }
        }
      } catch (err) {
        console.error('Error formatting match:', err, match)
        // Return a minimal safe match object
        return {
          id: match.id || '',
          userId: match.userId || '',
          psmId: match.psmId || '',
          status: match.status || 'active',
          matchedAt: match.matchedAt ? match.matchedAt.toISOString() : new Date().toISOString(),
          endedAt: match.endedAt ? match.endedAt.toISOString() : null,
          reason: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: null,
          psm: null,
          sessions: { total: 0, completed: 0, list: [] }
        }
      }
    })

    // Get stats
    const stats = {
      total: await prisma.match.count(),
      active: await prisma.match.count({ where: { status: 'active' } }),
      paused: await prisma.match.count({ where: { status: 'paused' } }),
      ended: await prisma.match.count({ where: { status: 'ended' } }),
    }

    return NextResponse.json({
      matches: formattedMatches,
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
      stats
    })
  } catch (error) {
    console.error('Error fetching matches:', error)
    
    // Enhanced error logging for production debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorName = error instanceof Error ? error.name : 'Unknown'
    
    // Check for common Prisma errors
    const errorDetails: {
      error: string
      message: string
      name: string
      diagnosis?: string
      stack?: string
    } = {
      error: 'Internal server error',
      message: errorMessage,
      name: errorName,
    }
    
    // Add more details in production for debugging
    if (process.env.NODE_ENV === 'production') {
      // Check for database connection errors
      if (errorMessage.includes('P1001') || errorMessage.includes('Can\'t reach database server')) {
        errorDetails.diagnosis = 'Database connection failed. Check DATABASE_URL in Vercel environment variables.'
      } else if (errorMessage.includes('P1003') || errorMessage.includes('Database does not exist')) {
        errorDetails.diagnosis = 'Database not found. Verify database name in DATABASE_URL.'
      } else if (errorMessage.includes('P1017') || errorMessage.includes('Server has closed the connection')) {
        errorDetails.diagnosis = 'Database connection closed. May need connection pooling configuration.'
      } else if (errorMessage.includes('P2002') || errorMessage.includes('Unique constraint')) {
        errorDetails.diagnosis = 'Database constraint violation.'
      }
      
      // Include stack trace in production for debugging (can be removed later)
      errorDetails.stack = errorStack
    } else {
      // Development: always include stack
      errorDetails.stack = errorStack
    }
    
    return NextResponse.json(
      errorDetails,
      { status: 500 }
    )
  }
}

