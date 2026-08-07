/**
 * Ripio Ramps Widget helpers (on-ramp / off-ramp URL flow).
 * Secrets stay server-side; this module is safe to import from API routes.
 * Client-safe exports: flow types, UUID helpers, address validation.
 */

export type RipioRampFlow = 'onramp' | 'offramp'
export type RipioEnv = 'sandbox' | 'production'

/** DNS namespace UUID — Motus Ripio external_ref is UUID v5 of this + user seed. */
const MOTUS_RIPIO_NAMESPACE = 'a3f1c8e2-4b5d-4e6f-8a9b-0c1d2e3f4a5b'

export type RipioWidgetCredentials = {
  clientId: string
  clientSecret: string
  env: RipioEnv
}

const AUTH_URLS: Record<RipioEnv, string> = {
  sandbox: 'https://b2b-widget-onramp-api.sandbox.ripio.com/api/v1/auth',
  production: 'https://b2b-widget-onramp-api.ripio.com/api/v1/auth',
}

const WIDGET_BASE_URLS: Record<RipioEnv, string> = {
  sandbox: 'https://b2b-widget-onramp.sandbox.ripio.com',
  production: 'https://b2b-widget-onramp.ripio.com',
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidCeloAddress(address: string): boolean {
  return ADDRESS_RE.test(address)
}

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export function isRipioRampFlow(value: unknown): value is RipioRampFlow {
  return value === 'onramp' || value === 'offramp'
}

/** Stable UUID v5 so the same Motus user always maps to the same Ripio external_ref. */
export function motusUserToRipioExternalRef(userSeed: string): string {
  const seed = userSeed.trim()
  if (!seed) {
    throw new Error('userSeed is required for Ripio external_ref')
  }
  return uuidV5(MOTUS_RIPIO_NAMESPACE, `motus:ripio:${seed}`)
}

export function getRipioEnv(): RipioEnv {
  const raw = (process.env.RIPIO_ENV || 'sandbox').toLowerCase()
  return raw === 'production' ? 'production' : 'sandbox'
}

export function getRipioCredentials(): RipioWidgetCredentials | null {
  const clientId = process.env.RIPIO_CLIENT_ID?.trim()
  const clientSecret = process.env.RIPIO_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  return {
    clientId,
    clientSecret,
    env: getRipioEnv(),
  }
}

/** Mock when forced, or when partner secrets are missing. */
export function shouldUseRipioMock(): boolean {
  if (process.env.RIPIO_MOCK === 'true') return true
  return getRipioCredentials() === null
}

export function getRipioAuthUrl(env: RipioEnv = getRipioEnv()): string {
  return AUTH_URLS[env]
}

export function buildRipioWidgetUrl(
  token: string,
  flow: RipioRampFlow,
  env: RipioEnv = getRipioEnv()
): string {
  const base = WIDGET_BASE_URLS[env]
  if (flow === 'offramp') {
    return `${base}/offramp.html?_to=${encodeURIComponent(token)}`
  }
  return `${base}?_to=${encodeURIComponent(token)}`
}

export type RipioWidgetAuthResult =
  | { ok: true; token: string; widgetUrl: string }
  | { ok: false; status: number; error: string; details?: string }

/**
 * Exchange partner credentials for a Ramps Widget JWT, then build the hosted URL.
 */
export async function requestRipioWidgetToken(params: {
  address: string
  externalRef: string
  flow: RipioRampFlow
  credentials?: RipioWidgetCredentials
}): Promise<RipioWidgetAuthResult> {
  const credentials = params.credentials ?? getRipioCredentials()
  if (!credentials) {
    return {
      ok: false,
      status: 503,
      error: 'Ripio credentials no configuradas',
    }
  }

  const authUrl = getRipioAuthUrl(credentials.env)
  const username = `${credentials.clientId}:${params.externalRef}:${params.address}`

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username,
      password: credentials.clientSecret,
    }),
  })

  const rawText = await response.text()
  let parsed: { succeed?: boolean; token?: string; detail?: string; error?: string } = {}
  try {
    parsed = rawText ? JSON.parse(rawText) : {}
  } catch {
    parsed = {}
  }

  if (!response.ok || !parsed.token) {
    return {
      ok: false,
      status: response.status || 502,
      error:
        parsed.detail ||
        parsed.error ||
        'No se pudo autenticar con Ripio Widget',
      details: rawText.slice(0, 500),
    }
  }

  return {
    ok: true,
    token: parsed.token,
    widgetUrl: buildRipioWidgetUrl(parsed.token, params.flow, credentials.env),
  }
}

function uuidV5(namespace: string, name: string): string {
  const namespaceBytes = uuidToBytes(namespace)
  const nameBytes = new TextEncoder().encode(name)
  const data = new Uint8Array(namespaceBytes.length + nameBytes.length)
  data.set(namespaceBytes, 0)
  data.set(nameBytes, namespaceBytes.length)

  const hash = sha1(data)
  hash[6] = (hash[6] & 0x0f) | 0x50
  hash[8] = (hash[8] & 0x3f) | 0x80

  return bytesToUuid(hash.subarray(0, 16))
}

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '')
  if (hex.length !== 32) {
    throw new Error('Invalid UUID namespace')
  }
  const out = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/** Pure SHA-1 for UUID v5 (works in browser and Node without `crypto` import). */
function sha1(message: Uint8Array): Uint8Array {
  const ml = message.length
  let paddedLen = ml + 1
  while (paddedLen % 64 !== 56) paddedLen++
  const totalLen = paddedLen + 8
  const padded = new Uint8Array(totalLen)
  padded.set(message)
  padded[ml] = 0x80

  const bitLen = ml * 8
  const view = new DataView(padded.buffer)
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false)
  view.setUint32(totalLen - 4, bitLen >>> 0, false)

  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0

  const w = new Int32Array(80)

  for (let i = 0; i < totalLen; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getInt32(i + j * 4, false)
    }
    for (let j = 16; j < 80; j++) {
      const x = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]
      w[j] = (x << 1) | (x >>> 31)
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4

    for (let j = 0; j < 80; j++) {
      let f: number
      let k: number
      if (j < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (j < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0
      e = d
      d = c
      c = ((b << 30) | (b >>> 2)) | 0
      b = a
      a = temp
    }

    h0 = (h0 + a) | 0
    h1 = (h1 + b) | 0
    h2 = (h2 + c) | 0
    h3 = (h3 + d) | 0
    h4 = (h4 + e) | 0
  }

  const out = new Uint8Array(20)
  const outView = new DataView(out.buffer)
  outView.setInt32(0, h0, false)
  outView.setInt32(4, h1, false)
  outView.setInt32(8, h2, false)
  outView.setInt32(12, h3, false)
  outView.setInt32(16, h4, false)
  return out
}
