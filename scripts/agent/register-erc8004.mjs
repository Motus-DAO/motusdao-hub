#!/usr/bin/env node
/**
 * Register the MotusDAO settlement agent in the ERC-8004 Identity Registry.
 *
 * Usage:
 *   node --env-file=.env.local scripts/agent/register-erc8004.mjs
 *
 * The signer must be the agent hot wallet (the same address the worker uses).
 * The metadata is served from public/agent.json at https://app.motusdao.org/agent.json.
 *
 * @see https://docs.celo.org/build/agents/8004
 * @see specs/therapy-escrow.md
 */
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'

const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
const METADATA_URI =
  process.env.AGENT_METADATA_URI || 'https://app.motusdao.org/agent.json'
const RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo.org'

const ABI = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
]

const rawKey = process.env.AGENT_PRIVATE_KEY
if (!rawKey) {
  console.error('[erc8004] AGENT_PRIVATE_KEY is required (add it to .env.local)')
  process.exit(2)
}

const account = privateKeyToAccount(
  rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`
)

const publicClient = createPublicClient({ chain: celo, transport: http(RPC_URL) })
const walletClient = createWalletClient({ account, chain: celo, transport: http(RPC_URL) })

console.log('[erc8004] agent wallet', account.address)
console.log('[erc8004] registry', IDENTITY_REGISTRY)
console.log('[erc8004] metadata', METADATA_URI)

const hash = await walletClient.writeContract({
  address: IDENTITY_REGISTRY,
  abi: ABI,
  functionName: 'register',
  args: [METADATA_URI],
})

console.log('[erc8004] tx', hash)
const receipt = await publicClient.waitForTransactionReceipt({ hash })
console.log('[erc8004] status', receipt.status)

const transfer = receipt.logs.find(
  (log) =>
    log.address.toLowerCase() === IDENTITY_REGISTRY.toLowerCase() &&
    log.topics.length === 4
)
const agentId = transfer ? BigInt(transfer.topics[3]).toString() : null

console.log(
  JSON.stringify(
    {
      agentWallet: account.address,
      registry: IDENTITY_REGISTRY,
      metadata: METADATA_URI,
      txHash: hash,
      status: receipt.status,
      agentId,
    },
    null,
    2
  )
)
