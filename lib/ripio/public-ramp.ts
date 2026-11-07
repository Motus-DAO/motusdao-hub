/**
 * Ripio public ramp (ramp.ripio.com) — the no-credentials path.
 *
 * The hosted B2B widget needs partner `client_id`/`client_secret`. This URL
 * sends the user straight into Ripio's own flow with country, chain, token and
 * wallet prefilled, so the on/off-ramp works without partner keys.
 *
 * `chain` is the numeric Celo chain id (the app matches `chainId === chain`).
 * `address` is the user's wallet in both flows; in the off-ramp it binds the
 * user to the session, it does NOT set the bank destination.
 *
 * @see https://github.com/Motus-DAO/motusdao-hub/blob/main/specs/ripio-public-ramp.md
 */
import type { RipioRampFlow } from './ramps-widget'
import { isValidCeloAddress } from './ramps-widget'

export type RipioCountry = 'MX' | 'AR'
export type RipioPublicToken = 'wMXN' | 'wARS'

export const RIPIO_PUBLIC_RAMP_BASE_URL = 'https://ramp.ripio.com'

/** Celo mainnet. Verified against /api/countries/{MX,AR}/networks. */
export const RIPIO_CELO_CHAIN_ID = 42220

const COUNTRY_TOKEN: Record<RipioCountry, RipioPublicToken> = {
  MX: 'wMXN',
  AR: 'wARS',
}

const AMOUNT_RE = /^\d+(\.\d+)?$/

export function isRipioCountry(value: unknown): value is RipioCountry {
  return value === 'MX' || value === 'AR'
}

/** Country for the public ramp; MX by default (the flow proven with wMXN). */
export function ripioCountryFromEnv(): RipioCountry {
  const raw = (process.env.NEXT_PUBLIC_RIPIO_COUNTRY || 'MX').trim().toUpperCase()
  return isRipioCountry(raw) ? raw : 'MX'
}

export function ripioTokenForCountry(country: RipioCountry): RipioPublicToken {
  return COUNTRY_TOKEN[country]
}

export type RipioPublicRampParams = {
  flow: RipioRampFlow
  country: RipioCountry
  address: string
  /** Fiat amount for the on-ramp; omit to let the user type it in Ripio. */
  amount?: string
}

export function buildRipioPublicRampUrl(params: RipioPublicRampParams): string {
  const { flow, country, address, amount } = params

  if (!isValidCeloAddress(address)) {
    throw new Error('La dirección de la wallet no es válida para Ripio.')
  }

  if (amount !== undefined && amount !== '') {
    const trimmed = amount.trim()
    if (!AMOUNT_RE.test(trimmed) || Number(trimmed) <= 0) {
      throw new Error('El monto debe ser un número positivo.')
    }
  }

  const url = new URL(flow === 'offramp' ? '/offramp' : '/', RIPIO_PUBLIC_RAMP_BASE_URL)
  url.searchParams.set('country', country)
  url.searchParams.set('chain', String(RIPIO_CELO_CHAIN_ID))
  url.searchParams.set('token', ripioTokenForCountry(country).toUpperCase())
  if (amount !== undefined && amount.trim() !== '') {
    url.searchParams.set('amount', amount.trim())
  }
  url.searchParams.set('address', address)

  return url.toString()
}
