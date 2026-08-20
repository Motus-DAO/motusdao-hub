/**
 * Ripio wFIAT on Celo — public ERC-20s (same address on every chain, 18 decimals).
 * Hold / transfer needs no partner account. Mint/redeem and ramps still do.
 *
 * @see https://action.ripio.com/en/blog/wfiat-stablecoins-now-live-on-celo
 * @see https://bridge.ripio.com/developers
 * @see https://docs.celo.org/build-on-celo/build-with-local-stablecoin
 */

export const RIPIO_WFIAT_TOKENS = {
  wARS: '0x0DC4F92879B7670e5f4e4e6e3c801D229129D90D',
  wBRL: '0xD76f5Faf6888e24D9F04Bf92a0c8B921FE4390e0',
  wMXN: '0x337E7456B420bD3481e7FA61fA9850343d610d34',
  wCOP: '0x8a1D45e102e886510e891d2Ec656a708991e2D76',
  wPEN: '0x4F34c8b3b5FB6D98Da888F0feA543d4d9C9F2eBE',
  wCLP: '0x61D450a098b6a7f69fC4b98CE68198fe59768651',
} as const

export type RipioWfiatSymbol = keyof typeof RIPIO_WFIAT_TOKENS

export const RIPIO_WFIAT_DECIMALS = 18

/** Public Textile FX app — wARS↔USDT and wBRL↔USDT on Celo. No Motus API key. */
export const TEXTILE_FX_SWAP_URL = 'https://app.textilecredit.com/s/swap'

const TEXTILE_FX_CORRIDORS: ReadonlySet<RipioWfiatSymbol> = new Set(['wARS', 'wBRL'])

export type PagosTokenCategory =
  | 'Native'
  | 'Stablecoin'
  | 'Mento Stablecoin'
  | 'Ripio wFIAT'
  | 'Utility'

export type PagosTokenInfo = {
  symbol: string
  name: string
  category: PagosTokenCategory
  region: string
}

export const RIPIO_WFIAT_CATALOG: readonly PagosTokenInfo[] = [
  {
    symbol: 'wARS',
    name: 'Ripio Peso Argentino',
    category: 'Ripio wFIAT',
    region: 'LATAM (Argentina)',
  },
  {
    symbol: 'wBRL',
    name: 'Ripio Real Brasileño',
    category: 'Ripio wFIAT',
    region: 'LATAM (Brasil)',
  },
  {
    symbol: 'wMXN',
    name: 'Ripio Peso Mexicano',
    category: 'Ripio wFIAT',
    region: 'LATAM (México)',
  },
  {
    symbol: 'wCOP',
    name: 'Ripio Peso Colombiano',
    category: 'Ripio wFIAT',
    region: 'LATAM (Colombia)',
  },
  {
    symbol: 'wPEN',
    name: 'Ripio Sol Peruano',
    category: 'Ripio wFIAT',
    region: 'LATAM (Perú)',
  },
  {
    symbol: 'wCLP',
    name: 'Ripio Peso Chileno',
    category: 'Ripio wFIAT',
    region: 'LATAM (Chile)',
  },
]

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

export function isRipioWfiatSymbol(value: string): value is RipioWfiatSymbol {
  return Object.prototype.hasOwnProperty.call(RIPIO_WFIAT_TOKENS, value)
}

export function isValidWfiatAddress(address: string): boolean {
  return ADDRESS_RE.test(address)
}

/** Textile FX Celo corridors only. Other wFIAT symbols return null (no swap CTA). */
export function getTextileFxSwapUrl(symbol: string): string | null {
  if (!isRipioWfiatSymbol(symbol)) return null
  if (!TEXTILE_FX_CORRIDORS.has(symbol)) return null
  return TEXTILE_FX_SWAP_URL
}
