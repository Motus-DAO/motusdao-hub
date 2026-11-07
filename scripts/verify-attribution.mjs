#!/usr/bin/env node
/**
 * Verify the Hub's ERC-8021 attribution code on Celo mainnet.
 *
 * Usage:
 *   npm run verify:attribution -- <txHash> [expectedCode]
 *   npm run verify:attribution -- --repo owner/repo [--code celo_xxx]
 *   npm run verify:attribution -- --show
 *
 * Env:
 *   CELO_ATTRIBUTION_CODE or NEXT_PUBLIC_CELO_ATTRIBUTION_CODE
 *   NEXT_PUBLIC_CELO_RPC_URL (default https://forno.celo.org)
 *
 * Exit codes: 0 ok, 1 verification failed, 2 usage/config error.
 *
 * @see https://github.com/celo-org/attribution-tags
 * @see specs/celo-attribution.md
 */
import { createPublicClient, http } from 'viem'
import { celo } from 'viem/chains'
import { codeFromRepo, verifyTx } from '@celo/attribution-tags'

const TX_HASH_RE = /^0x[0-9a-f]{64}$/i

function envCode() {
  return (
    process.env.CELO_ATTRIBUTION_CODE ||
    process.env.NEXT_PUBLIC_CELO_ATTRIBUTION_CODE ||
    ''
  ).trim()
}

function parseArgs(argv) {
  const out = { txHash: null, code: null, repo: null, show: false }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--code') out.code = argv[++i]
    else if (arg === '--repo') out.repo = argv[++i]
    else if (arg === '--show') out.show = true
    else if (!out.txHash) out.txHash = arg
    else out.code = out.code || arg
  }

  return out
}

function configError(message) {
  console.error(`[attribution] ${message}`)
  process.exit(2)
}

const args = parseArgs(process.argv.slice(2))
const expected = (args.code || envCode()).trim()

if (args.show || (!args.txHash && !args.repo)) {
  console.log(
    JSON.stringify(
      {
        configuredCode: expected || null,
        rpc: process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org',
        hint:
          'Pass a tx hash to verify on-chain, or --repo owner/repo to check the assigned code derivation.',
      },
      null,
      2
    )
  )
  if (!args.txHash && !args.repo) process.exit(0)
}

if (args.repo) {
  const derived = codeFromRepo(args.repo)
  console.log(`[attribution] codeFromRepo("${args.repo}") = ${derived}`)
  if (expected && derived !== expected) {
    console.error(
      `[attribution] MISMATCH: configured ${expected} does not match the repo-derived ${derived}.`
    )
    process.exit(1)
  }
  if (!args.txHash) process.exit(0)
}

if (!args.txHash) {
  configError('usage: verify-attribution.mjs <txHash> [expectedCode] | --repo owner/repo | --show')
}

if (!TX_HASH_RE.test(args.txHash)) {
  configError(`invalid tx hash: ${args.txHash}`)
}

const client = createPublicClient({
  chain: celo,
  transport: http(process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org'),
})

const result = await verifyTx({ client, hash: args.txHash })

if (!result) {
  console.error(
    `[attribution] NO TAG on ${args.txHash}. The transaction was sent without an ERC-8021 suffix.`
  )
  process.exit(1)
}

console.log(JSON.stringify({ tx: args.txHash, ...result }, null, 2))

if (expected && !result.codes.includes(expected)) {
  console.error(
    `[attribution] Tag found (${result.codes.join(', ')}) but it does not include ${expected}.`
  )
  process.exit(1)
}

console.log(`[attribution] OK ${args.txHash}${expected ? ` includes ${expected}` : ''}`)
