import { getAddress, type Address } from 'viem'

export type SessionPaymentAuthProvider = 'waap' | 'thirdweb' | 'external' | 'privy'

export type SessionPaymentContext = {
  address: Address
  authProvider: SessionPaymentAuthProvider
  eip1193Provider: unknown
}

/** Locked copy — specs/identity-payment-wallet-session-default.md P4 */
export const PAYMENT_SESSION_P4_COPY =
  'Para usar el saldo de esta wallet, inicia sesión conectando con el mismo proveedor (Human o Thirdweb) que la vinculaste.'

export function authProviderPaymentLabel(
  authProvider: string | null | undefined
): string {
  if (authProvider === 'thirdweb') return 'Thirdweb'
  if (authProvider === 'external') return 'Wallet externa'
  return 'Human'
}

export function normalizeSessionPaymentAddress(address: string): string {
  return getAddress(address.trim()).toLowerCase()
}

export function sessionWalletMatches(
  sessionEoa: string,
  connectedEoa: string | null | undefined
): boolean {
  if (!connectedEoa) return false
  try {
    return (
      normalizeSessionPaymentAddress(sessionEoa) ===
      normalizeSessionPaymentAddress(connectedEoa)
    )
  } catch {
    return false
  }
}

export function assertSessionWalletConnected(
  sessionEoa: string,
  connectedEoa: string | null | undefined
): void {
  if (!sessionWalletMatches(sessionEoa, connectedEoa)) {
    throw new Error(
      'La wallet conectada no coincide con tu sesión. Cierra sesión y entra con la wallet con la que quieres pagar.'
    )
  }
}

export function resolveSessionPaymentAuthProvider(
  authProvider: string | null | undefined
): SessionPaymentAuthProvider {
  if (authProvider === 'thirdweb') return 'thirdweb'
  if (authProvider === 'external') return 'external'
  if (authProvider === 'privy') return 'privy'
  return 'waap'
}

/**
 * P1/P6: spend path follows session.authProvider, not window.waap alone.
 */
export function resolvePaymentEip1193Provider(
  authProvider: string | null | undefined,
  waapBridgeProvider: unknown,
  thirdwebEip1193: unknown | null
): unknown {
  const resolved = resolveSessionPaymentAuthProvider(authProvider)
  if (resolved === 'thirdweb') {
    if (!thirdwebEip1193) {
      throw new Error(
        'Proveedor Thirdweb no disponible. Vuelve a conectar con Thirdweb para firmar.'
      )
    }
    return thirdwebEip1193
  }

  const waap =
    waapBridgeProvider ??
    (typeof window !== 'undefined'
      ? (window as unknown as { waap?: unknown }).waap
      : null)
  if (!waap) {
    throw new Error('Proveedor Human (WaaP) no disponible. Inicia sesión con Human.')
  }
  return waap
}

export function buildSessionPaymentContext(input: {
  sessionEoa: string
  sessionAuthProvider: string | null | undefined
  connectedEoa: string | null | undefined
  waapBridgeProvider: unknown
  thirdwebEip1193: unknown | null
}): SessionPaymentContext {
  assertSessionWalletConnected(input.sessionEoa, input.connectedEoa)
  const eip1193Provider = resolvePaymentEip1193Provider(
    input.sessionAuthProvider,
    input.waapBridgeProvider,
    input.thirdwebEip1193
  )
  return {
    address: getAddress(input.sessionEoa.trim()),
    authProvider: resolveSessionPaymentAuthProvider(input.sessionAuthProvider),
    eip1193Provider,
  }
}