/** Client-only session for Ripio Ramps mock wizard (shared on-ramp / off-ramp). */

export type RipioMockSession = {
  termsAccepted: boolean
  kycCompleted: boolean
  kycName: string
  payoutClabe: string
}

const STORAGE_PREFIX = 'motus:ripio-mock:'

export const MOCK_RIPIO = {
  country: 'MX',
  countryCode: 'MX',
  fiatCurrency: 'MXN',
  network: 'CELO',
  token: 'USDC',
  mockClabe: '646180157000000005',
  mockDepositClabe: '646180157000000004',
  mockRipioCryptoDeposit: '0x000000000000000000000000000000000000dEaD',
  mxnToUsdcRate: 17.5,
  feePercent: 1,
  quoteTtlSeconds: 30,
} as const

export function readRipioMockSession(walletKey: string): RipioMockSession {
  if (typeof window === 'undefined') {
    return emptySession()
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + walletKey)
    if (!raw) return emptySession()
    const parsed = JSON.parse(raw) as Partial<RipioMockSession>
    return {
      termsAccepted: Boolean(parsed.termsAccepted),
      kycCompleted: Boolean(parsed.kycCompleted),
      kycName: parsed.kycName ?? '',
      payoutClabe: parsed.payoutClabe ?? '',
    }
  } catch {
    return emptySession()
  }
}

export function writeRipioMockSession(
  walletKey: string,
  patch: Partial<RipioMockSession>
): RipioMockSession {
  const current = readRipioMockSession(walletKey)
  const next = { ...current, ...patch }
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_PREFIX + walletKey, JSON.stringify(next))
  }
  return next
}

export function emptySession(): RipioMockSession {
  return {
    termsAccepted: false,
    kycCompleted: false,
    kycName: '',
    payoutClabe: '',
  }
}

export function computeMockQuote(fiatAmountMxn: number) {
  const fee = fiatAmountMxn * (MOCK_RIPIO.feePercent / 100)
  const netFiat = fiatAmountMxn - fee
  const cryptoAmount = netFiat / MOCK_RIPIO.mxnToUsdcRate
  return {
    fiatAmount: fiatAmountMxn,
    fee,
    cryptoAmount: Math.round(cryptoAmount * 1e6) / 1e6,
    rate: MOCK_RIPIO.mxnToUsdcRate,
  }
}

export function buildMockRedirectParams(params: {
  action: 'onramp' | 'offramp'
  address: string
  fiatAmount: number
  cryptoAmount: number
  sessionId?: string
}) {
  const q = new URLSearchParams({
    external_ref: 'mock-session-token',
    action: params.action,
    crypto_amount: String(params.cryptoAmount),
    token: MOCK_RIPIO.token,
    network: MOCK_RIPIO.network,
    deposit_address: params.address,
    fiat_amount: String(params.fiatAmount),
    fiat_currency: MOCK_RIPIO.fiatCurrency,
    fees: String(Math.round(params.fiatAmount * (MOCK_RIPIO.feePercent / 100))),
    country_code: MOCK_RIPIO.countryCode,
  })
  if (params.sessionId) {
    q.set('session_id', params.sessionId)
  }
  return q.toString()
}
