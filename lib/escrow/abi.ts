import { parseAbi } from 'viem'

/** TherapyEscrow deployed on Celo mainnet (2026-11-08). */
export const THERAPY_ESCROW_ADDRESS = (process.env.ESCROW_CONTRACT_ADDRESS ||
  '0xFd9F38AD6143B018e60F86B5304C53223FBf2dBC') as `0x${string}`

/** Block of the escrow deployment; bounds the SessionCreated log scan. */
export const THERAPY_ESCROW_DEPLOY_BLOCK = BigInt(
  process.env.ESCROW_DEPLOY_BLOCK || '82227556'
)

/** Ripio wMXN on Celo (18 decimals). */
export const WMXN_ADDRESS =
  '0x337E7456B420bD3481e7FA61fA9850343d610d34' as const

export const THERAPY_ESCROW_ABI = parseAbi([
  'event SessionCreated(bytes32 indexed id, address indexed patient, address indexed payee, address token, uint256 amount, uint64 startsAt, uint32 challengeWindow)',
  'function sessions(bytes32 id) view returns (address token, address patient, address payee, uint256 amount, uint64 startsAt, uint64 settledAt, uint32 challengeWindow, uint8 status)',
  'function createSession(bytes32 id, address token, address patient, address payee, uint256 amount, uint64 startsAt, uint32 challengeWindow)',
  'function deposit(bytes32 id)',
  'function settle(bytes32 id)',
  'function release(bytes32 id)',
  'function cancelBeforeStart(bytes32 id)',
  'function refundStale(bytes32 id)',
  'function dispute(bytes32 id)',
  'function operator() view returns (address)',
  'function oracle() view returns (address)',
  'function treasury() view returns (address)',
  'function feeBps() view returns (uint16)',
])

export const ERC20_APPROVE_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
])
