/**
 * Settlement agent tick.
 *
 * Stateless and idempotent: reads every SessionCreated id from the escrow,
 * checks the session state, and releases the 90/10 split once a settled
 * session's challenge window has passed. No table, no queue: the chain is the
 * source of truth and `release` is a no-op (reverts) if it already ran.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbiItem,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import { toDataSuffix } from '@celo/attribution-tags'
import {
  THERAPY_ESCROW_ABI,
  THERAPY_ESCROW_ADDRESS,
  THERAPY_ESCROW_DEPLOY_BLOCK,
} from './abi'

const RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo.org'
const MAX_RELEASES_PER_TICK = 10

const SESSION_CREATED = parseAbiItem(
  'event SessionCreated(bytes32 indexed id, address indexed patient, address indexed payee, address token, uint256 amount, uint64 startsAt, uint32 challengeWindow)'
)

export type AgentTickResult = {
  checked: number
  released: number
  txs: Array<{ id: string; hash: string; status: string }>
  errors: string[]
}

function agentKey(): Hex {
  const raw = process.env.AGENT_PRIVATE_KEY
  if (!raw) throw new Error('AGENT_PRIVATE_KEY is required')
  return (raw.startsWith('0x') ? raw : `0x${raw}`) as Hex
}

export async function runAgentTick(): Promise<AgentTickResult> {
  const account = privateKeyToAccount(agentKey())
  const publicClient = createPublicClient({ chain: celo, transport: http(RPC_URL) })

  const code =
    process.env.CELO_ATTRIBUTION_CODE || process.env.NEXT_PUBLIC_CELO_ATTRIBUTION_CODE
  const suffix = code ? toDataSuffix(code) : undefined

  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http(RPC_URL),
    ...(suffix ? { dataSuffix: suffix } : {}),
  })

  // Celo RPCs reject eth_getLogs ranges above 5,000 blocks. Scan a rolling
  // window instead of everything since deploy; a 2-minute cron never misses a
  // session inside this window (~6 hours of Celo blocks).
  const latest = await publicClient.getBlockNumber()
  const scanWindow = BigInt(process.env.ESCROW_SCAN_BLOCKS || '4500')
  const windowStart = latest > scanWindow ? latest - scanWindow : BigInt(0)
  const fromBlock =
    windowStart > THERAPY_ESCROW_DEPLOY_BLOCK ? windowStart : THERAPY_ESCROW_DEPLOY_BLOCK

  if (fromBlock > latest) {
    return { checked: 0, released: 0, txs: [], errors: [] }
  }

  const logs = await publicClient.getLogs({
    address: THERAPY_ESCROW_ADDRESS,
    event: SESSION_CREATED,
    fromBlock,
    toBlock: latest,
  })

  const ids = [...new Set(logs.map((log) => log.args.id as Hex))]
  const now = Math.floor(Date.now() / 1000)
  const result: AgentTickResult = { checked: ids.length, released: 0, txs: [], errors: [] }

  for (const id of ids) {
    if (result.txs.length >= MAX_RELEASES_PER_TICK) break

    try {
      const session = (await publicClient.readContract({
        address: THERAPY_ESCROW_ADDRESS,
        abi: THERAPY_ESCROW_ABI,
        functionName: 'sessions',
        args: [id],
      })) as readonly [
        string,
        string,
        string,
        bigint,
        bigint,
        bigint,
        number,
        number,
      ]

      const status = Number(session[7])
      const settledAt = Number(session[5])
      const challengeWindow = Number(session[6])

      // Status enum: None=0, Created=1, Funded=2, Settled=3, Disputed=4,
      // Released=5, Refunded=6. Only Settled sessions are released here.
      if (status !== 3) continue
      if (now < settledAt + challengeWindow) continue

      const hash = await walletClient.writeContract({
        address: THERAPY_ESCROW_ADDRESS,
        abi: THERAPY_ESCROW_ABI,
        functionName: 'release',
        args: [id],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      result.txs.push({ id, hash, status: receipt.status })
      if (receipt.status === 'success') result.released += 1
    } catch (error) {
      result.errors.push(
        `${id}: ${error instanceof Error ? error.message : 'unknown error'}`
      )
    }
  }

  return result
}
