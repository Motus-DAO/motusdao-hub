import { parseAbiItem, type Address, type Hex } from 'viem'
import {
  THERAPY_ESCROW_ADDRESS,
  THERAPY_ESCROW_DEPLOY_BLOCK,
} from './abi'
import { escrowPublicClient, readEscrow, type EscrowSnapshot } from './create'

const SESSION_CREATED = parseAbiItem(
  'event SessionCreated(bytes32 indexed id, address indexed patient, address indexed payee, address token, uint256 amount, uint64 startsAt, uint32 challengeWindow)'
)

export type EscrowSessionListItem = EscrowSnapshot & { id: Hex }

/**
 * List the escrow sessions where `payee` is the professional. Used by the PSM
 * so they do not depend on the patient sharing the /pagar link.
 */
export async function listEscrowSessionsForPayee(
  payee: Address
): Promise<EscrowSessionListItem[]> {
  const client = escrowPublicClient()
  const latest = await client.getBlockNumber()
  const configured = BigInt(process.env.ESCROW_SCAN_BLOCKS || '4500')
  const chunk = configured > BigInt(0) ? configured : BigInt(4500)
  const ids = new Set<Hex>()

  if (latest >= THERAPY_ESCROW_DEPLOY_BLOCK) {
    for (
      let fromBlock = THERAPY_ESCROW_DEPLOY_BLOCK;
      fromBlock <= latest;
      fromBlock += chunk
    ) {
      const end = fromBlock + chunk - BigInt(1)
      const toBlock = end > latest ? latest : end
      const logs = await client.getLogs({
        address: THERAPY_ESCROW_ADDRESS,
        event: SESSION_CREATED,
        args: { payee },
        fromBlock,
        toBlock,
      })
      for (const log of logs) ids.add(log.args.id as Hex)
    }
  }

  const items = await Promise.all(
    [...ids].map(async (id) => {
      const escrow = await readEscrow(id)
      return escrow ? ({ id, ...escrow } as EscrowSessionListItem) : null
    })
  )

  return items
    .filter((item): item is EscrowSessionListItem => item !== null)
    .sort((a, b) => b.startsAt - a.startsAt)
}
