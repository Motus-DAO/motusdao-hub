import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, parseEther } from 'viem'
import { celoMainnet } from '@/lib/celo'
import { privateKeyToAccount } from 'viem/accounts'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import {
  faucetAccountKey,
  normalizeSpendAddress,
  sessionOwnsSpendAddress,
} from '@/lib/platform-spend-guard'

const FAUCET_AMOUNT = '0.3'

const lastClaimByAccount = new Map<string, number>()
const MIN_INTERVAL_MS =
  process.env.NODE_ENV === 'development' ? 2 * 60 * 1000 : 60 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request)

    const body = await request.json().catch(() => null) as
      | { address?: string }
      | null

    const to = body?.address?.trim()

    if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) {
      return NextResponse.json(
        { error: 'Dirección inválida' },
        { status: 400 }
      )
    }

    if (!sessionOwnsSpendAddress(session, to)) {
      return NextResponse.json(
        { error: 'La dirección no coincide con tu sesión.' },
        { status: 403 }
      )
    }

    const faucetPk = process.env.CELO_FAUCET_PRIVATE_KEY
    if (!faucetPk) {
      return NextResponse.json(
        { error: 'Faucet no configurado en el servidor' },
        { status: 500 }
      )
    }

    const accountKey = faucetAccountKey(session)
    const now = Date.now()
    const last = lastClaimByAccount.get(accountKey) ?? 0
    if (now - last < MIN_INTERVAL_MS) {
      const minutesLeft = Math.ceil((MIN_INTERVAL_MS - (now - last)) / 60000)
      return NextResponse.json(
        {
          error: 'Has reclamado recientemente',
          retryInMinutes: minutesLeft,
        },
        { status: 429 }
      )
    }

    const account = privateKeyToAccount(faucetPk as `0x${string}`)

    const walletClient = createWalletClient({
      account,
      chain: celoMainnet,
      transport: http(),
    })

    const publicClient = createPublicClient({
      chain: celoMainnet,
      transport: http(),
    })

    const recipient = normalizeSpendAddress(to)
    if (!recipient) {
      return NextResponse.json(
        { error: 'Dirección inválida' },
        { status: 400 }
      )
    }

    const value = parseEther(FAUCET_AMOUNT)

    const txHash = await walletClient.sendTransaction({
      to: recipient,
      value,
    })

    await publicClient.waitForTransactionReceipt({ hash: txHash })

    lastClaimByAccount.set(accountKey, Date.now())

    return NextResponse.json({
      success: true,
      txHash,
      amount: FAUCET_AMOUNT,
      to: recipient,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('[Faucet] Error enviando CELO:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Error desconocido en faucet',
      },
      { status: 500 }
    )
  }
}
