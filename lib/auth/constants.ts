export const SESSION_COOKIE_NAME = 'motus_session'
/** Clinical hub session cap (shorter than the former 7-day default). */
export const SESSION_MAX_AGE_SECONDS = 3 * 24 * 60 * 60 // 3 days
/** Idle window — re-auth after this long without an authenticated API call. */
export const SESSION_IDLE_MAX_SECONDS = 12 * 60 * 60 // 12 hours
/** Min gap before re-issuing the session cookie to slide idle expiry. */
export const SESSION_SLIDE_MIN_SECONDS = 5 * 60 // 5 minutes
export const NONCE_TTL_MS = 5 * 60 * 1000 // 5 minutes
export const SIWE_STATEMENT = 'Sign in to MotusDAO Hub'
export const SIWE_CHAIN_ID = 42220 // Celo mainnet
