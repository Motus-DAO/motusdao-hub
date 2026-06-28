import {
  createWalletClient,
  custom,
  getAddress,
  stringToHex,
  type Address,
  type Chain,
} from 'viem'
import { celoMainnet } from '@/lib/celo'
import { normalizeSignature } from '@/lib/auth/verify-siwe'

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

type WaapProvider = Eip1193Provider & {
  getLoginMethod?: () => 'waap' | 'injected' | 'walletconnect' | null
}

function getWindowEthereum(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null
  const ethereum = (window as unknown as { ethereum?: Eip1193Provider }).ethereum
  return ethereum ?? null
}

/**
 * Injected MetaMask often fails personal_sign through the WaaP proxy (4100).
 * Use the native injected provider when login method is 'injected'.
 */
export function resolveSigningProvider(waapProvider: unknown): unknown {
  const waap = waapProvider as WaapProvider
  const loginMethod = waap.getLoginMethod?.()

  if (loginMethod === 'injected') {
    const injected = getWindowEthereum()
    if (injected) {
      console.log('[auth] Using window.ethereum for injected wallet signing')
      return injected
    }
  }

  return waapProvider
}

export async function getActiveSignerAddress(
  provider: unknown
): Promise<Address> {
  const waap = provider as Eip1193Provider

  let accounts = (await waap.request({ method: 'eth_accounts' })) as string[]
  if (!accounts?.length) {
    accounts = (await waap.request({ method: 'eth_requestAccounts' })) as string[]
  }

  if (!accounts?.length) {
    throw new Error('No wallet account available')
  }

  return getAddress(accounts[0])
}

async function signWithViem(
  provider: unknown,
  message: string,
  address: Address
): Promise<string> {
  const client = createWalletClient({
    account: address,
    chain: celoMainnet as Chain,
    transport: custom(provider as Eip1193Provider),
  })

  return client.signMessage({
    account: address,
    message,
  })
}

async function signWithPersonalSign(
  provider: unknown,
  message: string,
  address: Address,
  params: [unknown, string]
): Promise<string> {
  const waap = provider as Eip1193Provider
  return (await waap.request({
    method: 'personal_sign',
    params,
  })) as string
}

/**
 * Try multiple signing strategies — WaaP / MetaMask / WalletConnect vary in what they accept.
 */
export async function signSiweMessage(
  waapProvider: unknown,
  message: string,
  address: string
): Promise<string> {
  const signerAddress = getAddress(address)
  const signingProvider = resolveSigningProvider(waapProvider)
  const loginMethod = (waapProvider as WaapProvider).getLoginMethod?.()
  const errors: string[] = []
  const hexMessage = stringToHex(message)

  // WaaP MPC + WalletConnect: personal_sign(hex, address) is the reliable path.
  // viem signMessage through the WaaP proxy often returns sigs that fail recovery.
  const preferPersonalSign =
    loginMethod === 'waap' ||
    loginMethod === 'walletconnect' ||
    signingProvider === waapProvider

  const personalSignAttempts: [unknown, string][] = preferPersonalSign
    ? [
        [hexMessage, signerAddress],
        [signerAddress, hexMessage],
        [message, signerAddress],
        [signerAddress, message],
      ]
    : [
        [hexMessage, signerAddress],
        [message, signerAddress],
        [signerAddress, hexMessage],
        [signerAddress, message],
      ]

  if (preferPersonalSign) {
    for (const params of personalSignAttempts) {
      try {
        const sig = await signWithPersonalSign(
          signingProvider,
          message,
          signerAddress,
          params
        )
        return normalizeSignature(sig)
      } catch (error) {
        errors.push(`personal_sign: ${formatSignError(error)}`)
      }
    }
  }

  // viem signMessage (works well for injected MetaMask)
  try {
    const sig = await signWithViem(signingProvider, message, signerAddress)
    return normalizeSignature(sig)
  } catch (error) {
    errors.push(`viem: ${formatSignError(error)}`)
  }

  if (!preferPersonalSign) {
    for (const params of personalSignAttempts) {
      try {
        const sig = await signWithPersonalSign(
          signingProvider,
          message,
          signerAddress,
          params
        )
        return normalizeSignature(sig)
      } catch (error) {
        errors.push(`personal_sign: ${formatSignError(error)}`)
      }
    }
  }

  // Fallback: original WaaP provider if we tried injected
  if (signingProvider !== waapProvider) {
    try {
      const sig = await signWithViem(waapProvider, message, signerAddress)
      return normalizeSignature(sig)
    } catch (error) {
      errors.push(`waap fallback: ${formatSignError(error)}`)
    }
  }

  console.error('[auth] All signing strategies failed:', errors)
  throw new SignMessageError(errors)
}

function formatSignError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

export class SignMessageError extends Error {
  constructor(public readonly attempts: string[]) {
    super(
      'No se pudo firmar el mensaje. Si usas MetaMask, ábrela y acepta la solicitud. ' +
        'Si el problema continúa, desconecta y vuelve a conectar la wallet.'
    )
    this.name = 'SignMessageError'
  }
}

export function isUserRejectedSignError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: number; message?: string }
  // 4001 = user rejected; 4100 often means provider/proxy issue with WaaP, not a real cancel
  if (e.code === 4001) return true
  if (typeof e.message === 'string') {
    const msg = e.message.toLowerCase()
    return (
      msg.includes('user rejected') ||
      msg.includes('user denied') ||
      msg.includes('rejected the request')
    )
  }
  return false
}
