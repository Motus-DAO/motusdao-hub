/**
 * Create and read TherapyEscrow sessions from the server.
 *
 * The escrow id is deterministic (`keccak256("therapy:" + sessionId)`) so Motty
 * can create a payment link once and return the same one on every retry.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import { toDataSuffix } from '@celo/attribution-tags'
import {
  THERAPY_ESCROW_ABI,
  THERAPY_ESCROW_ADDRESS,
  WMXN_ADDRESS,
} from './abi'

const RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo.org'
const ZERO = '0x0000000000000000000000000000000000000000'

export type EscrowSnapshot = {
  token: Address
  patient: Address
  payee: Address
  amount: bigint
  startsAt: number
  settledAt: number
  challengeWindow: number
  status: number
}

export function therapyEscrowId(sessionId: string): Hex {
  return keccak256(toHex(`therapy:${sessionId}`))
}

export function escrowPublicClient() {
  return createPublicClient({ chain: celo, transport: http(RPC_URL) })
}

export async function readEscrow(id: Hex): Promise<EscrowSnapshot | null> {
  const raw = (await escrowPublicClient().readContract({
    address: THERAPY_ESCROW_ADDRESS,
    abi: THERAPY_ESCROW_ABI,
    functionName: 'sessions',
    args: [id],
  })) as readonly [Address, Address, Address, bigint, bigint, bigint, number, number]

  if (raw[0] === ZERO) return null

  return {
    token: raw[0],
    patient: raw[1],
    payee: raw[2],
    amount: raw[3],
    startsAt: Number(raw[4]),
    settledAt: Number(raw[5]),
    challengeWindow: Number(raw[6]),
    status: Number(raw[7]),
  }
}

export async function createTherapyEscrow(params: {
  sessionId: string
  patient: Address
  payee: Address
  amount: bigint
  startsAt: number
  challengeWindow: number
}): Promise<{ id: Hex; created: boolean; txHash?: Hex; status: number }> {
  const id = therapyEscrowId(params.sessionId)

  const existing = await readEscrow(id)
  if (existing && existing.status !== 0) {
    return { id, created: false, status: existing.status }
  }

  const rawKey = process.env.AGENT_PRIVATE_KEY
  if (!rawKey) throw new Error('AGENT_PRIVATE_KEY is required')

  const account = privateKeyToAccount(
    (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as Hex
  )
  const code =
    process.env.CELO_ATTRIBUTION_CODE || process.env.NEXT_PUBLIC_CELO_ATTRIBUTION_CODE
  const suffix = code ? toDataSuffix(code) : undefined

  const publicClient = escrowPublicClient()
  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http(RPC_URL),
    ...(suffix ? { dataSuffix: suffix } : {}),
  })

  const hash = await walletClient.writeContract({
    address: THERAPY_ESCROW_ADDRESS,
    abi: THERAPY_ESCROW_ABI,
    functionName: 'createSession',
    args: [
      id,
      WMXN_ADDRESS,
      params.patient,
      params.payee,
      params.amount,
      BigInt(params.startsAt),
      params.challengeWindow,
    ],
  })

  await publicClient.waitForTransactionReceipt({ hash })
  return { id, created: true, txHash: hash, status: 1 }
}
