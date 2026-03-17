import { NextResponse } from 'next/server'
import { createWalletClient, http, parseEther } from 'viem'
import { celoMainnet } from '@/lib/celo'
import { privateKeyToAccount } from 'viem/accounts'

// Amount of CELO to send per faucet claim (0.01 CELO)
const FAUCET_AMOUNT = '0.01'

// Simple in-memory rate limiting (per address) for this server process.
// NOTE: For production, replace with Redis or a DB-based limit.
const lastClaimByAddress = new Map<string, number>()
const MIN_INTERVAL_MS = 60 * 60 * 1000 // 1 hour between claims per address

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as
      | { address?: string }
      | null

    const to = body?.address?.toLowerCase()

    if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) {
      return NextResponse.json(
        { error: 'Dirección inválida' },
        { status: 400 },
      )
    }

    const faucetPk = process.env.CELO_FAUCET_PRIVATE_KEY
    if (!faucetPk) {
      return NextResponse.json(
        { error: 'Faucet no configurado en el servidor' },
        { status: 500 },
      )
    }

    // Basic per-address rate limiting
    const now = Date.now()
    const last = lastClaimByAddress.get(to) ?? 0
    if (now - last < MIN_INTERVAL_MS) {
      const minutesLeft = Math.ceil((MIN_INTERVAL_MS - (now - last)) / 60000)
      return NextResponse.json(
        {
          error: 'Has reclamado recientemente',
          retryInMinutes: minutesLeft,
        },
        { status: 429 },
      )
    }

    const account = privateKeyToAccount(faucetPk as `0x${string}`)

    const walletClient = createWalletClient({
      account,
      chain: celoMainnet,
      transport: http(),
    })

    const value = parseEther(FAUCET_AMOUNT)

    const txHash = await walletClient.sendTransaction({
      to: to as `0x${string}`,
      value,
    })

    lastClaimByAddress.set(to, now)

    return NextResponse.json({
      success: true,
      txHash,
      amount: FAUCET_AMOUNT,
      to,
    })
  } catch (error) {
    console.error('[Faucet] Error enviando CELO:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Error desconocido en faucet',
      },
      { status: 500 },
    )
  }
}

