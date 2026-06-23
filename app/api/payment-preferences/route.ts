import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'

/**
 * GET /api/payment-preferences?userId=xxx
 * Gets payment preference for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      )
    }

    await requireSelfOrAdmin(request, userId)

    const preference = await prisma.paymentPreference.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            userMatches: {
              where: { status: 'active' },
              include: {
                psm: {
                  include: {
                    profile: true
                  }
                }
              },
              take: 1
            }
          }
        }
      }
    })

    // If no preference exists, create default one
    if (!preference) {
      const newPreference = await prisma.paymentPreference.create({
        data: {
          userId,
          defaultDestination: 'own_wallet'
        },
        include: {
          user: {
            include: {
              userMatches: {
                where: { status: 'active' },
                include: {
                  psm: {
                    include: {
                      profile: true
                    }
                  }
                },
                take: 1
              }
            }
          }
        }
      })

      return NextResponse.json({
        preference: {
          id: newPreference.id,
          userId: newPreference.userId,
          defaultDestination: newPreference.defaultDestination,
          hasMatchedPSM: newPreference.user.userMatches.length > 0,
          matchedPSM: newPreference.user.userMatches[0] ? {
            id: newPreference.user.userMatches[0].psm.id,
            smartWalletAddress: newPreference.user.userMatches[0].psm.smartWalletAddress
          } : null
        }
      })
    }

    return NextResponse.json({
      preference: {
        id: preference.id,
        userId: preference.userId,
        defaultDestination: preference.defaultDestination,
        hasMatchedPSM: preference.user.userMatches.length > 0,
        matchedPSM: preference.user.userMatches[0] ? {
          id: preference.user.userMatches[0].psm.id,
          smartWalletAddress: preference.user.userMatches[0].psm.smartWalletAddress
        } : null
      }
    })

  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching payment preference:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/payment-preferences
 * Updates payment preference for a user
 * 
 * Body: { userId: string, defaultDestination: 'own_wallet' | 'matched_psm' | 'dao_treasury' }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, defaultDestination } = body

    if (!userId || !defaultDestination) {
      return NextResponse.json(
        { error: 'userId y defaultDestination son requeridos' },
        { status: 400 }
      )
    }

    await requireSelfOrAdmin(request, userId)

    if (!['own_wallet', 'matched_psm', 'dao_treasury'].includes(defaultDestination)) {
      return NextResponse.json(
        { error: 'defaultDestination debe ser: own_wallet, matched_psm, o dao_treasury' },
        { status: 400 }
      )
    }

    // If selecting matched_psm, verify user has an active match
    if (defaultDestination === 'matched_psm') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userMatches: {
            where: { status: 'active' },
            take: 1
          }
        }
      })

      if (!user || user.userMatches.length === 0) {
        return NextResponse.json(
          { error: 'No tienes un profesional emparejado activo' },
          { status: 400 }
        )
      }
    }

    const preference = await prisma.paymentPreference.upsert({
      where: { userId },
      update: {
        defaultDestination: defaultDestination as 'own_wallet' | 'matched_psm' | 'dao_treasury'
      },
      create: {
        userId,
        defaultDestination: defaultDestination as 'own_wallet' | 'matched_psm' | 'dao_treasury'
      },
      include: {
        user: {
          include: {
            userMatches: {
              where: { status: 'active' },
              include: {
                psm: {
                  include: {
                    profile: true
                  }
                }
              },
              take: 1
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Preferencia de pago actualizada',
      preference: {
        id: preference.id,
        userId: preference.userId,
        defaultDestination: preference.defaultDestination,
        hasMatchedPSM: preference.user.userMatches.length > 0,
        matchedPSM: preference.user.userMatches[0] ? {
          id: preference.user.userMatches[0].psm.id,
          smartWalletAddress: preference.user.userMatches[0].psm.smartWalletAddress
        } : null
      }
    })

  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error updating payment preference:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
















