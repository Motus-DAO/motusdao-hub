import { parseAbiItem, type Address, type Hex } from 'viem'
import {
  THERAPY_ESCROW_ADDRESS,
  THERAPY_ESCROW_DEPLOY_BLOCK,
} from './abi'
import { escrowPublicClient, readEscrow, type EscrowSnapshot } from './create'

const SESSION_CREATED = parseAbiItem(
  'event SessionCreated(bytes32 indexed id, address indexed patient, address indexed payee, address token, uint256 amount, uint64 startsAt, uint32 challengeWindow)'
)

export type EscrowRole = 'patient' | 'payee'
export type EscrowSessionListItem = EscrowSnapshot & {
  id: Hex
  role: EscrowRole
}

/**
 * Sessions where `address` is the patient or the professional. Used by the PSM
 * sessions page and by the finance activity read model (no Blockscout needed).
 */
export async function listEscrowSessionsForAddress(
  address: Address
): Promise<EscrowSessionListItem[]> {
  const client = escrowPublicClient()
  const latest = await client.getBlockNumber()
  const configured = BigInt(process.env.ESCROW_SCAN_BLOCKS || '4500')
  const chunk = configured > BigInt(0) ? configured : BigInt(4500)
  const ids = new Map<Hex, EscrowRole>()

  if (latest >= THERAPY_ESCROW_DEPLOY_BLOCK) {
    for (
      let fromBlock = THERAPY_ESCROW_DEPLOY_BLOCK;
      fromBlock <= latest;
      fromBlock += chunk
    ) {
      const end = fromBlock + chunk - BigInt(1)
      const toBlock = end > latest ? latest : end

      const asPatient = await client.getLogs({
        address: THERAPY_ESCROW_ADDRESS,
        event: SESSION_CREATED,
        args: { patient: address },
        fromBlock,
        toBlock,
      })
      for (const log of asPatient) {
        if (!ids.has(log.args.id as Hex)) ids.set(log.args.id as Hex, 'patient')
      }

      const asPayee = await client.getLogs({
        address: THERAPY_ESCROW_ADDRESS,
        event: SESSION_CREATED,
        args: { payee: address },
        fromBlock,
        toBlock,
      })
      for (const log of asPayee) {
        if (!ids.has(log.args.id as Hex)) ids.set(log.args.id as Hex, 'payee')
      }
    }
  }

  const items = await Promise.all(
    [...ids.entries()].map(async ([id, role]) => {
      const escrow = await readEscrow(id)
      return escrow ? ({ id, role, ...escrow } as EscrowSessionListItem) : null
    })
  )

  return items
    .filter((item): item is EscrowSessionListItem => item !== null)
    .sort((a, b) => b.startsAt - a.startsAt)
}

/** Sessions where the professional is the payee. */
export async function listEscrowSessionsForPayee(
  payee: Address
): Promise<EscrowSessionListItem[]> {
  const all = await listEscrowSessionsForAddress(payee)
  return all.filter((item) => item.role === 'payee')
}
