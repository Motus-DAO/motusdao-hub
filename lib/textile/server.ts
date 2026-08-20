/**
 * Server-only Textile FX v1 client. API key never leaves this module.
 * @see https://docs.textilecredit.com/api/v1/authentication
 */

import { TEXTILE_API_BASE, TEXTILE_CELO_CHAIN_ID, TEXTILE_TICKERS_URL } from './fx'
import type { TextileTicker, TextileUnsignedTx } from './fx'

export function getTextileApiKey(): string | null {
  return process.env.TEXTILE_API_KEY?.trim() || null
}

export function hasTextileApiKey(): boolean {
  return getTextileApiKey() !== null
}

async function textileJson<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const key = getTextileApiKey()
  if (!key) {
    return { ok: false, status: 503, error: 'TEXTILE_API_KEY no configurada' }
  }

  const response = await fetch(`${TEXTILE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  const rawText = await response.text()
  let parsed: { data?: T; error?: string; message?: string } = {}
  try {
    parsed = rawText ? (JSON.parse(rawText) as typeof parsed) : {}
  } catch {
    parsed = {}
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: parsed.error || parsed.message || `Textile FX ${response.status}`,
    }
  }

  return { ok: true, data: (parsed.data ?? parsed) as T }
}

export type TextileLiveQuote = {
  chainId: number
  sellToken: string
  buyToken: string
  sellAmount: string
  fillableAmount?: string
  proceeds?: string
  effectiveRateRay?: string
  remainingAmount?: string
  fullyFilled?: boolean
  hasLiquidity?: boolean
  liveOrders?: number
}

export async function fetchTextileQuote(params: {
  sellToken: string
  buyToken: string
  sellAmount: string
}): Promise<{ ok: true; data: TextileLiveQuote } | { ok: false; status: number; error: string }> {
  const query = new URLSearchParams({
    chainId: String(TEXTILE_CELO_CHAIN_ID),
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    sellAmount: params.sellAmount,
  })
  return textileJson<TextileLiveQuote>(`/quote?${query.toString()}`)
}

export type TextileBuiltSwap = {
  id?: string
  status?: string
  fillable: boolean
  reason?: string
  fillableAmount?: string
  proceeds?: string
  requiredAllowance?: string
  liveOrders?: number
  transactions?: {
    approval?: TextileUnsignedTx
    swap?: TextileUnsignedTx
  }
}

export async function buildTextileSwap(params: {
  sellToken: string
  buyToken: string
  sellAmount: string
  taker: string
  minRate?: string
}): Promise<{ ok: true; data: TextileBuiltSwap } | { ok: false; status: number; error: string }> {
  return textileJson<TextileBuiltSwap>('/swaps', {
    method: 'POST',
    headers: {
      'Idempotency-Key': `motus-${params.taker}-${params.sellAmount}-${Date.now()}`,
    },
    body: JSON.stringify({
      chainId: TEXTILE_CELO_CHAIN_ID,
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: params.sellAmount,
      taker: params.taker,
      ...(params.minRate ? { minRate: params.minRate } : {}),
    }),
  })
}

export async function submitTextileSwap(id: string, txHash: string) {
  return textileJson(`/swaps/${encodeURIComponent(id)}/submit`, {
    method: 'POST',
    body: JSON.stringify({ txHash }),
  })
}

export async function fetchPublicTickers(): Promise<TextileTicker[]> {
  const response = await fetch(TEXTILE_TICKERS_URL)
  if (!response.ok) {
    throw new Error(`Textile tickers ${response.status}`)
  }
  const data = (await response.json()) as TextileTicker[]
  return Array.isArray(data) ? data : []
}
