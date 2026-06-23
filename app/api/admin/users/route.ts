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
    const role = searchParams.get('role') || ''
    const showDeleted = searchParams.get('showDeleted') === 'true'
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.UserWhereInput = {}
    
    // Filter by deletion status
    if (showDeleted) {
      // Show only deleted users
      where.deletedAt = { not: null }
    } else {
      // Show only active users (default)
      where.deletedAt = null
    }
    
    if (role && ['usuario', 'psm', 'admin'].includes(role)) {
      where.role = role as 'usuario' | 'psm' | 'admin'
    }

    // Get users with related data first (we'll filter in memory if search is needed)
    let users = await prisma.user.findMany({
      where,
      include: {
        profile: true,
        patient: true,
        psm: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
    })

    // Ensure users is an array
    if (!Array.isArray(users)) {
      users = []
    }

    // Apply search filter in memory if needed
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim()
      users = users.filter(user => {
        try {
          return (
            (user.email && user.email.toLowerCase().includes(searchLower)) ||
            (user.eoaAddress && user.eoaAddress.toLowerCase().includes(searchLower)) ||
            (user.smartWalletAddress && user.smartWalletAddress.toLowerCase().includes(searchLower)) ||
            (user.profile && (
              (user.profile.nombre && user.profile.nombre.toLowerCase().includes(searchLower)) ||
              (user.profile.apellido && user.profile.apellido.toLowerCase().includes(searchLower))
            ))
          )
        } catch (err) {
          console.error('Error filtering user:', err, user)
          return false
        }
      })
    }

    // Get total count
    const total = users.length

    // Apply pagination
    const paginatedUsers = users.slice(skip, skip + limit)

    // Format users data - convert dates to ISO strings for JSON serialization
    const formattedUsers = paginatedUsers.map(user => {
      try {
        return {
          id: user.id,
          email: user.email || '',
          role: user.role,
          eoaAddress: user.eoaAddress || '',
          smartWalletAddress: user.smartWalletAddress || null,
          privyId: user.privyId || null,
          registrationCompleted: user.registrationCompleted || false,
          deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
          createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
          profile: user.profile ? {
            nombre: user.profile.nombre || '',
            apellido: user.profile.apellido || '',
            telefono: user.profile.telefono || '',
            fechaNacimiento: user.profile.fechaNacimiento ? user.profile.fechaNacimiento.toISOString() : null,
            ciudad: user.profile.ciudad || '',
            pais: user.profile.pais || '',
            avatarUrl: user.profile.avatarUrl || null,
            bio: user.profile.bio || null,
            language: user.profile.language || 'es',
          } : null,
          patientProfile: user.patient ? {
            tipoAtencion: user.patient.tipoAtencion || '',
            problematica: user.patient.problematica || '',
            preferenciaAsignacion: user.patient.preferenciaAsignacion || '',
          } : null,
          psmProfile: user.psm ? {
            cedulaProfesional: user.psm.cedulaProfesional || '',
            formacionAcademica: user.psm.formacionAcademica || '',
            experienciaAnios: user.psm.experienciaAnios || 0,
            biografia: user.psm.biografia || null,
            especialidades: user.psm.especialidades || '',
            participaSupervision: user.psm.participaSupervision || false,
            participaCursos: user.psm.participaCursos || false,
            participaInvestigacion: user.psm.participaInvestigacion || false,
            participaComunidad: user.psm.participaComunidad || false,
          } : null,
        }
      } catch (err) {
        console.error('Error formatting user:', err, user)
        // Return a minimal safe user object
        return {
          id: user.id || '',
          email: user.email || '',
          role: user.role || 'usuario',
          eoaAddress: user.eoaAddress || '',
          smartWalletAddress: null,
          privyId: null,
          registrationCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          profile: null,
          patientProfile: null,
          psmProfile: null,
        }
      }
    })

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
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

