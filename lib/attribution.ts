/**
 * Celo attribution (ERC-8021) for transactions sent by the Hub.
 *
 * The suffix must ride on every Celo **mainnet** transaction. A transaction
 * without it can never be credited retroactively, so the code is read from the
 * build env and applied where the wallet client is created, not per call site.
 *
 * @see https://github.com/celo-org/attribution-tags
 * @see specs/celo-attribution.md
 */
import { toDataSuffix } from '@celo/attribution-tags'
import type { Hex } from 'viem'

/** Builder code assigned at enrollment (`celo_xxxxxxxx`) or a custom code. */
export const ATTRIBUTION_CODE_ENV = 'NEXT_PUBLIC_CELO_ATTRIBUTION_CODE'

/** ERC-8021 accepts 1–32 chars from `[a-z0-9_]`. */
const CODE_RE = /^[a-z0-9_]{1,32}$/

let cached: { code: string; suffix: Hex } | null = null
let warned = false

export function isAttributionCode(value: unknown): value is string {
  return typeof value === 'string' && CODE_RE.test(value)
}

/**
 * Returns the configured code, or `null` when tagging is disabled.
 *
 * A malformed value is warned once and treated as disabled: breaking every
 * payment is worse than sending an untagged tx, and CI asserts the code.
 */
export function getAttributionCode(): string | null {
  const raw = (
    process.env.NEXT_PUBLIC_CELO_ATTRIBUTION_CODE ||
    process.env.CELO_ATTRIBUTION_CODE ||
    ''
  ).trim()

  if (!raw) return null

  if (!isAttributionCode(raw)) {
    if (!warned) {
      warned = true
      console.warn(
        `[attribution] Ignoring invalid ${ATTRIBUTION_CODE_ENV}: expected /^[a-z0-9_]{1,32}$/. ` +
          'Transactions will be sent without an ERC-8021 suffix.'
      )
    }
    return null
  }

  return raw
}

/**
 * Encoded calldata suffix, or `undefined` when no code is configured.
 * Cached per code so the SHA/encode step runs once per session.
 */
export function getAttributionSuffix(): Hex | undefined {
  const code = getAttributionCode()
  if (!code) return undefined
  if (cached?.code === code) return cached.suffix

  const suffix = toDataSuffix(code) as Hex
  cached = { code, suffix }
  return suffix
}

/**
 * Appends the suffix to raw calldata for send paths that build
 * `eth_sendTransaction` params by hand (no viem `dataSuffix`).
 * Idempotent: already-tagged data is returned untouched.
 */
export function appendAttributionData(data?: Hex): Hex | undefined {
  const suffix = getAttributionSuffix()
  if (!suffix) return data
  if (!data || data === '0x') return suffix

  const suffixBody = suffix.slice(2).toLowerCase()
  if (data.toLowerCase().endsWith(suffixBody)) return data

  return `${data}${suffixBody}` as Hex
}
