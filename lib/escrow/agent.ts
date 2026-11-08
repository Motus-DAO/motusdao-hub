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

  // Celo RPCs cap eth_getLogs at 5,000 blocks per call. Page from the deploy
  // block instead of a rolling window, so a session created earlier is never
  // missed just because the chain moved past the window.
  const latest = await publicClient.getBlockNumber()
  const configuredChunk = BigInt(process.env.ESCROW_SCAN_BLOCKS || '4500')
  const chunkSize = configuredChunk > BigInt(0) ? configuredChunk : BigInt(4500)
  const sessionIds = new Set<Hex>()

  if (latest >= THERAPY_ESCROW_DEPLOY_BLOCK) {
    for (
      let fromBlock = THERAPY_ESCROW_DEPLOY_BLOCK;
      fromBlock <= latest;
      fromBlock += chunkSize
    ) {
      const chunkEnd = fromBlock + chunkSize - BigInt(1)
      const toBlock = chunkEnd > latest ? latest : chunkEnd
      const chunk = await publicClient.getLogs({
        address: THERAPY_ESCROW_ADDRESS,
        event: SESSION_CREATED,
        fromBlock,
        toBlock,
      })
      for (const log of chunk) sessionIds.add(log.args.id as Hex)
    }
  }

  const ids = [...sessionIds]
  console.log('[agent/tick] scan', {
    from: Number(THERAPY_ESCROW_DEPLOY_BLOCK),
    to: Number(latest),
    sessions: ids.length,
  })
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
