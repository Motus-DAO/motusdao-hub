import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth/admin-route'

/**
 * GET /api/admin/mns
 * Debug view: MNS registration data per user
 */
export async function GET(request: NextRequest) {
  try {
    const denied = await guardAdmin(request)
    if (denied) return denied

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        eoaAddress: true,
        smartWalletAddress: true,
        motusName: true,
        mnsTxHash: true,
        mnsRegisteredAt: true,
        profileNftTxHash: true,
        profileNftTokenURI: true,
        registrationCompleted: true,
        onboardingStatus: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: [
        { motusName: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    const withMns = users.filter((u) => u.motusName)
    const withoutMns = users.length - withMns.length

    return NextResponse.json({
      summary: {
        totalUsers: users.length,
        withMotusName: withMns.length,
        withoutMotusName: withoutMns,
        withMnsTxHash: users.filter((u) => u.mnsTxHash).length
      },
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        nombre: user.profile
          ? `${user.profile.nombre} ${user.profile.apellido}`.trim()
          : null,
        eoaAddress: user.eoaAddress,
        smartWalletAddress: user.smartWalletAddress,
        motusName: user.motusName,
        motusNameDisplay: user.motusName ? `${user.motusName}.motus` : null,
        mnsTxHash: user.mnsTxHash,
        mnsRegisteredAt: user.mnsRegisteredAt?.toISOString() ?? null,
        mnsExplorerUrl: user.mnsTxHash
          ? `https://celoscan.io/tx/${user.mnsTxHash}`
          : null,
        profileNftTxHash: user.profileNftTxHash,
        profileNftTokenURI: user.profileNftTokenURI,
        registrationCompleted: user.registrationCompleted,
        onboardingStatus: user.onboardingStatus,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('Error fetching MNS debug data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
