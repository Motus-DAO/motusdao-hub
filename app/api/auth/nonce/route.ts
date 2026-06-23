import { NextRequest, NextResponse } from 'next/server'
import { SiweMessage } from 'siwe'
import { getAddress, isAddress } from 'viem'
import { createAuthNonce } from '@/lib/auth/nonce'
import {
  getRequestDomain,
  getRequestOrigin,
} from '@/lib/auth/session'
import { SIWE_CHAIN_ID, SIWE_STATEMENT } from '@/lib/auth/constants'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: 'Valid wallet address is required' },
        { status: 400 }
      )
    }

    const checksummedAddress = getAddress(address)
    const nonce = await createAuthNonce(checksummedAddress)
    const domain = getRequestDomain(request)
    const origin = getRequestOrigin(request)

    const siweMessage = new SiweMessage({
      domain,
      address: checksummedAddress,
      statement: SIWE_STATEMENT,
      uri: origin,
      version: '1',
      chainId: SIWE_CHAIN_ID,
      nonce,
    })

    return NextResponse.json({
      message: siweMessage.prepareMessage(),
      nonce,
      address: checksummedAddress,
    })
  } catch (error) {
    console.error('[auth/nonce] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create authentication nonce' },
      { status: 500 }
    )
  }
}
