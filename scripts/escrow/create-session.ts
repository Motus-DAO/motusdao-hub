/**
 * Create a TherapyEscrow session from the agent (operator) wallet.
 *
 * Usage:
 *   npm run escrow:create
 *
 * Env (.env.local):
 *   PATIENT_ADDRESS          required
 *   PAYEE_ADDRESS            required
 *   SESSION_AMOUNT           1 (wMXN, 18 decimals)
 *   SESSION_START_MINUTES    2
 *   CHALLENGE_WINDOW_SECONDS 0
 *   SESSION_SEED             demo-<timestamp>
 *   AGENT_PRIVATE_KEY        required (operator)
 *   CELO_ATTRIBUTION_CODE    optional; tags the create tx
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseUnits,
  toHex,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import { toDataSuffix } from '@celo/attribution-tags'
import {
  THERAPY_ESCROW_ABI,
  THERAPY_ESCROW_ADDRESS,
  WMXN_ADDRESS,
} from '../../lib/escrow/abi'

const RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo.org'
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

function requireAddress(name: string): `0x${string}` {
  const value = process.env[name]
  if (!value || !ADDRESS_RE.test(value)) {
    throw new Error(`${name} must be a 0x-prefixed address`)
  }
  return value as `0x${string}`
}

async function main() {
  const rawKey = process.env.AGENT_PRIVATE_KEY
  if (!rawKey) throw new Error('AGENT_PRIVATE_KEY is required')

  const patient = requireAddress('PATIENT_ADDRESS')
  const payee = requireAddress('PAYEE_ADDRESS')
  const amount = parseUnits(process.env.SESSION_AMOUNT || '1', 18)
  const startMinutes = Number(process.env.SESSION_START_MINUTES || '2')
  const challengeWindow = Number(process.env.CHALLENGE_WINDOW_SECONDS || '0')
  const seed = process.env.SESSION_SEED || `demo-${Date.now()}`

  const account = privateKeyToAccount(
    (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as Hex
  )
  const publicClient = createPublicClient({ chain: celo, transport: http(RPC_URL) })

  const operator = await publicClient.readContract({
    address: THERAPY_ESCROW_ADDRESS,
    abi: THERAPY_ESCROW_ABI,
    functionName: 'operator',
  })
  if (operator.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(
      `agent ${account.address} is not the escrow operator (${operator})`
    )
  }

  const code =
    process.env.CELO_ATTRIBUTION_CODE || process.env.NEXT_PUBLIC_CELO_ATTRIBUTION_CODE
  const suffix = code ? toDataSuffix(code) : undefined
  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http(RPC_URL),
    ...(suffix ? { dataSuffix: suffix } : {}),
  })

  const id = keccak256(toHex(seed))
  const startsAt = BigInt(Math.floor(Date.now() / 1000) + startMinutes * 60)

  console.log('[escrow:create]', {
    id,
    seed,
    patient,
    payee,
    amount: amount.toString(),
    startsAt: startsAt.toString(),
    challengeWindow,
  })

  const hash = await walletClient.writeContract({
    address: THERAPY_ESCROW_ADDRESS,
    abi: THERAPY_ESCROW_ABI,
    functionName: 'createSession',
    args: [id, WMXN_ADDRESS, patient, payee, amount, startsAt, challengeWindow],
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log(
    JSON.stringify(
      {
        id,
        seed,
        patient,
        payee,
        amountWmxn: process.env.SESSION_AMOUNT || '1',
        startsAt: startsAt.toString(),
        challengeWindow,
        txHash: hash,
        status: receipt.status,
        payUrl: `https://app.motusdao.org/pagar/${id}`,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error('[escrow:create]', error)
  process.exitCode = 1
})
