import { NextRequest, NextResponse } from 'next/server'
import { uploadProfileMetadataToIPFS } from '@/lib/profile-nft-metadata'
import { getCeloClient, getProfileNftContract } from '@/lib/profile-nft-onchain'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { sessionOwnsSpendAddress } from '@/lib/platform-spend-guard'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request)
    const body = await request.json()
    const { wallet, role, registrationDate } = body as {
      wallet?: string
      role?: 'usuario' | 'psm'
      registrationDate?: string
    }

    if (!wallet || !role) {
      return NextResponse.json(
        { success: false, error: 'wallet y role son obligatorios' },
        { status: 400 }
      )
    }

    if (!sessionOwnsSpendAddress(session, wallet)) {
      return NextResponse.json(
        { success: false, error: 'La wallet no coincide con la sesión.' },
        { status: 403 }
      )
    }

    const date =
      registrationDate || new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    console.log('[profile/nft] Subiendo metadata a IPFS...')
    const tokenURI = await uploadProfileMetadataToIPFS({
      wallet,
      role,
      registrationDate: date
    })
    console.log('[profile/nft] IPFS OK:', tokenURI)

    const client = getCeloClient()
    const contract = getProfileNftContract(client)

    try {
      console.log('[profile/nft] Llamando mintProfile en Celo:', wallet)
      const hash = await contract.write.mintProfile([wallet as `0x${string}`, tokenURI])
      const txHash = String(hash)
      console.log('[profile/nft] Mint tx enviada:', hash)

      await prisma.user.updateMany({
        where: { eoaAddress: wallet },
        data: {
          profileNftTxHash: txHash,
          profileNftTokenURI: tokenURI
        }
      })

      return NextResponse.json({
        success: true,
        tokenURI,
        txHash
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err)
      console.error('[profile/nft] Error en mint:', message)

      // Si el contrato revierte porque el perfil ya existe, tratamos esto como un "ok":
      // no volvemos a mintear, pero no bloqueamos el onboarding.
      if (message.includes('Profile already exists')) {
        console.warn(
          '[profile/nft] Profile already exists for wallet, omitiendo nuevo mint:',
          wallet
        )
        await prisma.user.updateMany({
          where: { eoaAddress: wallet },
          data: {
            profileNftTokenURI: tokenURI
          }
        })
        return NextResponse.json({
          success: true,
          tokenURI,
          txHash: null,
          alreadyExists: true
        })
      }

      throw err
    }
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('[profile/nft] Error in /api/profile/nft:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Error desconocido al mintear NFT de perfil'
      },
      { status: 500 }
    )
  }
}
