/**
 * Textile FX corridors we can settle in-app on Celo (WaaP signs, Motus never
 * sends the user to app.textilecredit.com).
 *
 * @see https://docs.textilecredit.com/api/v1/
 * @see https://docs.textilecredit.com/address-book
 */

import { parseUnits, formatUnits, type Address, type Hex } from 'viem'
import { CELO_STABLE_TOKENS } from '../celo'
import { RIPIO_WFIAT_TOKENS } from '../ripio/wfiat'

export const TEXTILE_CELO_CHAIN_ID = 42220
export const TEXTILE_API_BASE = 'https://api.textilecredit.com/v1'
export const TEXTILE_TICKERS_URL = 'https://api.textilecredit.com/tickers'
export const TEXTILE_LIMIT_ORDER_REACTOR =
  '0xa9AA0a64769cBed4d3B1Ceb4Df01CdE915C235b3' as Address

export const TEXTILE_SWAP_SYMBOLS = ['wARS', 'wBRL', 'USDT'] as const
export type TextileSwapSymbol = (typeof TEXTILE_SWAP_SYMBOLS)[number]
export type TextileWfiatLeg = 'wARS' | 'wBRL'

export const TEXTILE_TOKEN_DECIMALS: Record<TextileSwapSymbol, number> = {
  wARS: 18,
  wBRL: 18,
  USDT: 6,
}

export const TEXTILE_TOKEN_ADDRESSES: Record<TextileSwapSymbol, Address> = {
  wARS: RIPIO_WFIAT_TOKENS.wARS as Address,
  wBRL: RIPIO_WFIAT_TOKENS.wBRL as Address,
  USDT: CELO_STABLE_TOKENS.USDT as Address,
}

const TICKER_BY_WFIAT: Record<TextileWfiatLeg, string> = {
  wARS: 'USDT_WARS',
  wBRL: 'USDT_WBRL',
}

export type TextileUnsignedTx = {
  to: Address
  data: Hex
  value: string
  chainId: number
}

export type TextileTicker = {
  ticker_id: string
  last_price: string
  bid?: string
  ask?: string
}

export function isTextileSwapSymbol(value: string): value is TextileSwapSymbol {
  return (TEXTILE_SWAP_SYMBOLS as readonly string[]).includes(value)
}

export function isTextileWfiatLeg(value: string): value is TextileWfiatLeg {
  return value === 'wARS' || value === 'wBRL'
}

/** Pairs with a live Textile Celo corridor. */
export function resolveTextilePair(
  sellSymbol: string,
  buySymbol: string
): { sellSymbol: TextileSwapSymbol; buySymbol: TextileSwapSymbol; wfiat: TextileWfiatLeg } | null {
  if (sellSymbol === buySymbol) return null
  if (sellSymbol === 'USDT' && isTextileWfiatLeg(buySymbol)) {
    return { sellSymbol: 'USDT', buySymbol, wfiat: buySymbol }
  }
  if (buySymbol === 'USDT' && isTextileWfiatLeg(sellSymbol)) {
    return { sellSymbol, buySymbol: 'USDT', wfiat: sellSymbol }
  }
  return null
}

export function tickerIdForWfiat(wfiat: TextileWfiatLeg): string {
  return TICKER_BY_WFIAT[wfiat]
}

export function toAtomicAmount(human: string, symbol: TextileSwapSymbol): string {
  return parseUnits(human, TEXTILE_TOKEN_DECIMALS[symbol]).toString()
}

export function fromAtomicAmount(atomic: string, symbol: TextileSwapSymbol, digits = 6): string {
  const formatted = formatUnits(BigInt(atomic), TEXTILE_TOKEN_DECIMALS[symbol])
  const n = Number(formatted)
  if (!Number.isFinite(n)) return formatted
  return n.toLocaleString('en-US', {
    useGrouping: false,
    maximumFractionDigits: digits,
  })
}

/**
 * Public ticker last_price is target-per-base for USDT_WARS / USDT_WBRL
 * (local units per 1 USDT).
 */
export function indicativeBuyAmount(params: {
  sellSymbol: TextileSwapSymbol
  buySymbol: TextileSwapSymbol
  sellAmountHuman: string
  localPerUsdt: number
}): string | null {
  const sell = Number(params.sellAmountHuman)
  if (!Number.isFinite(sell) || sell <= 0 || !(params.localPerUsdt > 0)) return null
  if (params.sellSymbol === 'USDT') {
    return String(sell * params.localPerUsdt)
  }
  return String(sell / params.localPerUsdt)
}

export function applySlippageRay(rateRay: string, bps: number): string {
  const rate = BigInt(rateRay)
  const kept = BigInt(10000 - bps)
  return ((rate * kept) / BigInt(10000)).toString()
}

export function pickTickerPrice(ticker: TextileTicker | undefined): number | null {
  if (!ticker) return null
  const raw = ticker.last_price || ticker.bid || ticker.ask
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}
