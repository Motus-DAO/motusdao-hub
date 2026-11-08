/**
 * Wallet history from Blockscout (Celo mainnet).
 *
 * Layer 1 of specs/onchain-history.md: the screen reads chain facts without a
 * local table. The normalizer is pure so it can be tested without network, and
 * the API can later swap Blockscout for `onchain_transactions` without changing
 * the UI contract.
 */
import { formatUnits } from 'viem'
import { CELO_STABLE_TOKENS, getCeloTokenDecimals } from '../celo'

export const CELO_BLOCKSCOUT_API = 'https://celo.blockscout.com/api'
export const CELOSCAN_TX_URL = 'https://celoscan.io/tx'

export type OnchainHistoryDirection = 'sent' | 'received'
export type OnchainHistoryStatus = 'confirmed' | 'failed'

export type OnchainHistoryItem = {
  txHash: string
  direction: OnchainHistoryDirection
  symbol: string
  amount: string
  rawAmount: string
  decimals: number
  from: string
  to: string
  /** Unix milliseconds. */
  timestamp: number
  status: OnchainHistoryStatus
  tokenAddress: string | null
  explorerUrl: string
}

type BlockscoutTokenTx = {
  hash: string
  from: string
  to: string
  value: string
  contractAddress?: string
  timeStamp: string
  txreceipt_status?: string
  isError?: string
}

type BlockscoutTx = {
  hash: string
  from: string
  to: string
  value: string
  timeStamp: string
  txreceipt_status?: string
  isError?: string
}

type BlockscoutResponse<T> = {
  status?: string
  message?: string
  result?: T[] | string
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

function knownTokens(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [symbol, address] of Object.entries(CELO_STABLE_TOKENS)) {
    if (ADDRESS_RE.test(address)) map.set(address.toLowerCase(), symbol)
  }
  return map
}

function statusOf(tx: { txreceipt_status?: string; isError?: string }): OnchainHistoryStatus {
  if (tx.txreceipt_status === '0' || tx.isError === '1') return 'failed'
  return 'confirmed'
}

function explorerUrl(hash: string): string {
  return `${CELOSCAN_TX_URL}/${hash}`
}

/**
 * Normalizes Blockscout `tokentx` + `txlist` into one chronological list.
 * Unknown ERC-20 contracts are dropped (spam airdrops), and native CELO only
 * counts when it actually moved value.
 */
export function normalizeBlockscoutHistory(input: {
  address: string
  tokentx?: BlockscoutTokenTx[] | null
  txlist?: BlockscoutTx[] | null
}): OnchainHistoryItem[] {
  const owner = input.address.toLowerCase()
  const tokens = knownTokens()
  const items: OnchainHistoryItem[] = []

  for (const tx of input.tokentx ?? []) {
    const tokenAddress = tx.contractAddress?.toLowerCase()
    const symbol = tokenAddress ? tokens.get(tokenAddress) : undefined
    if (!symbol) continue
    if (!tx.value || tx.value === '0') continue

    const from = tx.from?.toLowerCase() ?? ''
    const to = tx.to?.toLowerCase() ?? ''
    if (from !== owner && to !== owner) continue

    const decimals = getCeloTokenDecimals(symbol)
    items.push({
      txHash: tx.hash,
      direction: from === owner ? 'sent' : 'received',
      symbol,
      amount: formatUnits(BigInt(tx.value), decimals),
      rawAmount: tx.value,
      decimals,
      from,
      to,
      timestamp: Number(tx.timeStamp) * 1000,
      status: statusOf(tx),
      tokenAddress: tokenAddress ?? null,
      explorerUrl: explorerUrl(tx.hash),
    })
  }

  for (const tx of input.txlist ?? []) {
    // Token transfers already come from `tokentx`; native only counts with value.
    if (!tx.value || tx.value === '0') continue

    const from = tx.from?.toLowerCase() ?? ''
    const to = tx.to?.toLowerCase() ?? ''
    if (from !== owner && to !== owner) continue

    items.push({
      txHash: tx.hash,
      direction: from === owner ? 'sent' : 'received',
      symbol: 'CELO',
      amount: formatUnits(BigInt(tx.value), 18),
      rawAmount: tx.value,
      decimals: 18,
      from,
      to,
      timestamp: Number(tx.timeStamp) * 1000,
      status: statusOf(tx),
      tokenAddress: null,
      explorerUrl: explorerUrl(tx.hash),
    })
  }

  const seen = new Set<string>()
  return items
    .filter((item) => {
      const key = `${item.txHash}:${item.tokenAddress ?? 'native'}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.timestamp - a.timestamp)
}

async function parseList<T>(response: Response): Promise<T[]> {
  if (!response.ok) {
    throw new Error(`Blockscout responded ${response.status}`)
  }

  const payload = (await response.json()) as BlockscoutResponse<T>
  return Array.isArray(payload.result) ? payload.result : []
}

const HISTORY_CACHE_MS = 60_000
const historyCache = new Map<
  string,
  { at: number; items: OnchainHistoryItem[] }
>()

async function fetchWithRetry(
  url: string,
  fetchImpl: typeof fetch
): Promise<Response> {
  let last: Response | null = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetchImpl(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })
    if (response.ok) return response
    last = response
    if (response.status === 429 && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 900))
      continue
    }
    return response
  }
  return last as Response
}

/** Fetches the last 50 token + native transfers for an address. */
export async function fetchBlockscoutHistory(
  address: string,
  fetchImpl: typeof fetch = fetch
): Promise<OnchainHistoryItem[]> {
  const useCache = fetchImpl === fetch
  const cacheKey = address.toLowerCase()
  const cached = useCache ? historyCache.get(cacheKey) : undefined
  if (cached && Date.now() - cached.at < HISTORY_CACHE_MS) {
    return cached.items
  }

  const base = process.env.CELO_BLOCKSCOUT_URL?.trim() || CELO_BLOCKSCOUT_API
  const query = (action: string) =>
    `${base}?module=account&action=${action}&address=${address}&sort=desc&page=1&offset=50`

  try {
    const [tokenResponse, txResponse] = await Promise.all([
      fetchWithRetry(query('tokentx'), fetchImpl),
      fetchWithRetry(query('txlist'), fetchImpl),
    ])

    const [tokentx, txlist] = await Promise.all([
      parseList<BlockscoutTokenTx>(tokenResponse),
      parseList<BlockscoutTx>(txResponse),
    ])

    const items = normalizeBlockscoutHistory({ address, tokentx, txlist })
    if (useCache) historyCache.set(cacheKey, { at: Date.now(), items })
    return items
  } catch (error) {
    // A rate-limited refresh should not wipe a recent successful read.
    if (cached) return cached.items
    throw error
  }
}
