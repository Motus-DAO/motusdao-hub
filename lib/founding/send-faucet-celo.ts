import { createPublicClient, createWalletClient, formatEther, getAddress, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celoMainnet } from '@/lib/celo'
import { prisma } from '@/lib/prisma'
import { getRequiredCeloForMnsRegistration } from '@/lib/mns-register'

const FAUCET_AMOUNT = '0.3'

export type FoundingFaucetSendResult =
  | { sent: true; txHash: string; amount: string }
  | { sent: false; skipped: true; reason: 'already_claimed' | 'sufficient_balance' }

function foundingFaucetEnabled(): boolean {
  const flag = process.env.FOUNDING_FAUCET_ENABLED?.trim()
  if (flag === 'false' || flag === '0') return false
  if (flag === 'true' || flag === '1') return true
  return Boolean(process.env.CELO_FAUCET_PRIVATE_KEY?.trim())
}

export function isFoundingFaucetEnabled(): boolean {
  return foundingFaucetEnabled()
}

export async function sendFoundingFaucetCelo(to: string): Promise<FoundingFaucetSendResult> {
  if (!foundingFaucetEnabled()) {
    throw new Error('Founding faucet is not enabled')
  }

  const checksum = getAddress(to.trim())
  const walletKey = checksum.toLowerCase()

  const existing = await prisma.foundingFaucetClaim.findUnique({
    where: { wallet: walletKey },
  })
  if (existing) {
    return { sent: false, skipped: true, reason: 'already_claimed' }
  }

  const faucetPk = process.env.CELO_FAUCET_PRIVATE_KEY?.trim()
  if (!faucetPk) {
    throw new Error('CELO_FAUCET_PRIVATE_KEY is not configured')
  }

  const publicClient = createPublicClient({
    chain: celoMainnet,
    transport: http(),
  })

  const balance = await publicClient.getBalance({ address: checksum })
  const skipFloor = await getRequiredCeloForMnsRegistration()
  if (balance >= skipFloor) {
    return { sent: false, skipped: true, reason: 'sufficient_balance' }
  }

  const account = privateKeyToAccount(
    (faucetPk.startsWith('0x') ? faucetPk : `0x${faucetPk}`) as `0x${string}`
  )

  const expectedFaucet = process.env.CELO_FAUCET_ADDRESS?.trim().toLowerCase()
  if (expectedFaucet && account.address.toLowerCase() !== expectedFaucet) {
    throw new Error(
      `CELO_FAUCET_PRIVATE_KEY does not control CELO_FAUCET_ADDRESS (${expectedFaucet})`
    )
  }

  const walletClient = createWalletClient({
    account,
    chain: celoMainnet,
    transport: http(),
  })

  const value = parseEther(FAUCET_AMOUNT)
  const txHash = await walletClient.sendTransaction({
    account,
    chain: celoMainnet,
    to: checksum,
    value,
  })

  await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 90_000 })

  await prisma.foundingFaucetClaim.create({
    data: {
      wallet: walletKey,
      txHash,
      amount: FAUCET_AMOUNT,
    },
  })

  console.info(
    JSON.stringify({
      scope: 'motus.hub.founding_faucet',
      wallet: walletKey,
      txHash,
      amount: FAUCET_AMOUNT,
      balanceBefore: formatEther(balance),
    })
  )

  return { sent: true, txHash, amount: FAUCET_AMOUNT }
}