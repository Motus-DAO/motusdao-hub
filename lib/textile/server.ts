/**
 * Server-only Textile FX v2 RFQ client.
 * Anonymous wallet-bound quotes (same as the public Swap page). Do not send a
 * `tx_test_…` key — partners without `rfqV2Allowed` get 403 and test keys
 * cannot touch Celo 42220.
 *
 * @see https://docs.textilecredit.com/api/v2/
 * @see https://docs.textilecredit.com/api/v2/rfq
 */

import { TEXTILE_API_BASE, TEXTILE_CELO_CHAIN_ID, TEXTILE_TICKERS_URL } from './fx'
import type { Address, Hex } from 'viem'
import type { TextileTicker, TextileUnsignedTx } from './fx'

const RFQ_REQUEST_TIMEOUT_MS = 10_000

export function getTextileApiKey(): string | null {
  return process.env.TEXTILE_API_KEY?.trim() || null
}

/** Opt-in partner credential. Default is anonymous RFQ (public Swap path). */
export function textileV2AuthHeaders(): Record<string, string> {
  if (process.env.TEXTILE_RFQ_USE_API_KEY !== 'true') return {}
  const key = getTextileApiKey()
  if (!key || !key.startsWith('tx_live_')) return {}
  return { Authorization: `Bearer ${key}` }
}

function textileErrorMessage(
  parsed: { error?: unknown; message?: unknown },
  status: number
): string {
  const nested =
    parsed.error && typeof parsed.error === 'object' && parsed.error !== null
      ? (parsed.error as { message?: unknown }).message
      : parsed.error
  const raw =
    (typeof nested === 'string' && nested) ||
    (typeof parsed.message === 'string' && parsed.message) ||
    `Textile FX ${status}`
  if (/not allowlisted for the RFQ v2 API/i.test(raw)) {
    return 'Esta partner key no está en la allowlist RFQ v2. Motus cotiza anónimo como el Swap público.'
  }
  if (/not available for test keys/i.test(raw)) {
    return 'Esta API key es de testnet. Celo mainnet usa RFQ v2 anónimo (sin key).'
  }
  return raw
}

function isAllowlistForbidden(error: string): boolean {
  return /allowlist|RFQ v2 API/i.test(error)
}

async function textileJson<T>(
  path: string,
  init?: RequestInit,
  extraHeaders?: Record<string, string>
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const send = async (withAuth: boolean) => {
    const response = await fetch(`${TEXTILE_API_BASE}${path}`, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(RFQ_REQUEST_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        ...(withAuth ? textileV2AuthHeaders() : {}),
        ...(extraHeaders || {}),
        ...(init?.headers || {}),
      },
    })

    const rawText = await response.text()
    let parsed: { data?: T; error?: unknown; message?: unknown } = {}
    try {
      parsed = rawText ? (JSON.parse(rawText) as typeof parsed) : {}
    } catch {
      parsed = {}
    }

    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        error: textileErrorMessage(parsed, response.status),
      }
    }

    return { ok: true as const, data: (parsed.data ?? parsed) as T }
  }

  const first = await send(true)
  if (
    !first.ok &&
    first.status === 403 &&
    isAllowlistForbidden(first.error) &&
    Object.keys(textileV2AuthHeaders()).length > 0
  ) {
    return send(false)
  }
  return first
}

function asUnsignedTx(raw: unknown): TextileUnsignedTx | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const tx = raw as { to?: string; data?: string; value?: string; chainId?: number }
  if (!tx.to || !tx.data) return undefined
  return {
    to: tx.to as Address,
    data: tx.data as Hex,
    value: tx.value || '0',
    chainId: tx.chainId ?? TEXTILE_CELO_CHAIN_ID,
  }
}

export type TextileRfqPreview = {
  status: 'preview' | 'no_quote' | string
  reason?: string
  sellAmount?: string
  buyAmount?: string
  feeAmount?: string
  takerPays?: string
  rateRay?: string
  availableSellAmount?: string
  availableBuyAmount?: string
}

export type TextileRfqQuote = {
  sellAmount?: string
  buyAmount?: string
  feeAmount?: string
  takerPays?: string
  rateRay?: string
  expiresAt?: string
  orderDeadline?: string
  reactor?: string
  taker?: string
}

export type TextileRfqRequest = {
  rfqId?: string
  claimToken?: string
  status: 'quoted' | 'no_quote' | string
  reason?: string
  availableSellAmount?: string
  availableBuyAmount?: string
  quote?: TextileRfqQuote
  transactions?: {
    approval?: TextileUnsignedTx
    swap?: TextileUnsignedTx
  }
}

type TextileRfqRequestRaw = Omit<TextileRfqRequest, 'transactions'> & {
  transactions?: {
    approval?: unknown
    swap?: unknown
  }
}

export async function previewTextileRfq(params: {
  sellToken: string
  buyToken: string
  sellAmount: string
}): Promise<{ ok: true; data: TextileRfqPreview } | { ok: false; status: number; error: string }> {
  return textileJson<TextileRfqPreview>('/rfq/preview', {
    method: 'POST',
    body: JSON.stringify({
      chainId: TEXTILE_CELO_CHAIN_ID,
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: params.sellAmount,
    }),
  })
}

export async function requestTextileRfq(params: {
  sellToken: string
  buyToken: string
  sellAmount: string
  taker: string
}): Promise<{ ok: true; data: TextileRfqRequest } | { ok: false; status: number; error: string }> {
  const result = await textileJson<TextileRfqRequestRaw>('/rfq/request', {
    method: 'POST',
    body: JSON.stringify({
      chainId: TEXTILE_CELO_CHAIN_ID,
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: params.sellAmount,
      taker: params.taker,
    }),
  })
  if (!result.ok) return result
  return {
    ok: true,
    data: {
      ...result.data,
      transactions: {
        approval: asUnsignedTx(result.data.transactions?.approval),
        swap: asUnsignedTx(result.data.transactions?.swap),
      },
    },
  }
}

export async function submitTextileRfq(id: string, txHash: string, claimToken?: string | null) {
  const claim = claimToken?.trim()
  return textileJson(`/rfq/${encodeURIComponent(id)}/submit`, {
    method: 'POST',
    body: JSON.stringify({ txHash }),
  }, claim ? { 'X-Rfq-Claim': claim } : undefined)
}

export async function fetchPublicTickers(): Promise<TextileTicker[]> {
  const response = await fetch(TEXTILE_TICKERS_URL)
  if (!response.ok) {
    throw new Error(`Textile tickers ${response.status}`)
  }
  const data = (await response.json()) as TextileTicker[]
  return Array.isArray(data) ? data : []
}
