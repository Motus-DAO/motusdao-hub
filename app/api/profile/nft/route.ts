import { NextResponse } from 'next/server'
import { uploadProfileMetadataToIPFS } from '@/lib/profile-nft-metadata'
import { getCeloClient, getProfileNftContract } from '@/lib/profile-nft-onchain'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
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
      console.log('[profile/nft] Mint tx enviada:', hash)

      return NextResponse.json({
        success: true,
        tokenURI,
        txHash: hash
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

