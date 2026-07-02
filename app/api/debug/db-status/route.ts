import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { debugApiGuard } from '@/lib/debug-api'

export async function GET() {
  const blocked = debugApiGuard()
  if (blocked) return blocked

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Get all users with their related data
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        patient: true,
        psm: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get counts
    const totalUsers = await prisma.user.count()
    // eoaAddress is required, so all users should have one
    const usersWithWallets = totalUsers
    const usersWithProfiles = await prisma.user.count({
      where: {
        profile: {
          isNot: null
        }
      }
    })
    const psmUsers = await prisma.user.count({
      where: {
        role: 'psm'
      }
    })
    const regularUsers = await prisma.user.count({
      where: {
        role: 'usuario'
      }
    })

    // Check for smart wallets (they typically start with 0x and are 42 chars long)
    // Smart wallets are usually longer than EOA addresses, but both are 42 chars
    // We can't easily distinguish, but we can check if they exist
    const usersWithSmartWallets = users.filter(u => 
      u.smartWalletAddress && u.smartWalletAddress.startsWith('0x') && u.smartWalletAddress.length === 42
    ).length

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      statistics: {
        totalUsers,
        usersWithWallets,
        usersWithSmartWallets,
        usersWithProfiles,
        psmUsers,
        regularUsers
      },
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        eoaAddress: user.eoaAddress,
        smartWalletAddress: user.smartWalletAddress,
        privyId: user.privyId,
        role: user.role,
        hasProfile: !!user.profile,
        hasPatientProfile: !!user.patient,
        hasPSMProfile: !!user.psm,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: user.profile ? {
          nombre: user.profile.nombre,
          apellido: user.profile.apellido,
          ciudad: user.profile.ciudad,
          pais: user.profile.pais
        } : null,
        patientProfile: user.patient ? {
          tipoAtencion: user.patient.tipoAtencion,
          preferenciaAsignacion: user.patient.preferenciaAsignacion
        } : null,
        psmProfile: user.psm ? {
          cedulaProfesional: user.psm.cedulaProfesional,
          experienciaAnios: user.psm.experienciaAnios,
          especialidades: user.psm.especialidades
        } : null
      }))
    })
  } catch (error) {
    console.error('Database status check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

