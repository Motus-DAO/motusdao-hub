import {
  createWalletClient,
  custom,
  getAddress,
  stringToHex,
  type Address,
  type Chain,
} from 'viem'
import { celoMainnet } from '@/lib/celo'
import { SIWE_SIGN_TIMEOUT_MS } from '@/lib/auth/hub-session'
import { normalizeSignature } from '@/lib/auth/verify-siwe'

type Eip1193Provider = {
  isWaaP?: boolean
  request: (args: {
    method: string
    params?: unknown[]
    signal?: AbortSignal
    timeoutMs?: number
  }) => Promise<unknown>
}

type WaapProvider = Eip1193Provider & {
  getLoginMethod?: () => 'waap' | 'human' | 'injected' | 'walletconnect' | null
}

function getWindowEthereum(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null
  const ethereum = (window as unknown as { ethereum?: Eip1193Provider }).ethereum
  return ethereum ?? null
}

export async function withSignTimeout<T>(
  promise: Promise<T>,
  timeoutMs = SIWE_SIGN_TIMEOUT_MS,
  message = 'La firma tardó demasiado. Revisa si hay un popup de wallet bloqueado e intenta de nuevo.',
  onTimeout?: () => void
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          onTimeout?.()
          reject(new Error(message))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function requestWalletWithTimeout<T>(
  provider: unknown,
  args: { method: string; params?: unknown[] },
  timeoutMs: number,
  timeoutMessage: string,
  parentSignal?: AbortSignal
): Promise<T> {
  const waap = provider as Eip1193Provider
  const controller = new AbortController()
  let timedOut = false

  const abortFromParent = () => controller.abort(parentSignal?.reason)
  if (parentSignal?.aborted) {
    abortFromParent()
  } else {
    parentSignal?.addEventListener('abort', abortFromParent, { once: true })
  }

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort(new Error(timeoutMessage))
  }, timeoutMs)

  try {
    const request = waap.isWaaP
      ? { ...args, signal: controller.signal, timeoutMs }
      : args
    return (await waap.request(request)) as T
  } catch (error) {
    if (timedOut || parentSignal?.aborted) throw new Error(timeoutMessage)
    throw error
  } finally {
    clearTimeout(timer)
    parentSignal?.removeEventListener('abort', abortFromParent)
  }
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
  provider: unknown,
  signal?: AbortSignal
): Promise<Address> {
  const timeoutMs = Math.min(SIWE_SIGN_TIMEOUT_MS, 20_000)
  const timeoutMessage = 'No se pudo conectar con la wallet. Recarga e intenta de nuevo.'
  const deadline = Date.now() + timeoutMs

  let accounts = await requestWalletWithTimeout<string[]>(
    provider,
    { method: 'eth_accounts' },
    timeoutMs,
    timeoutMessage,
    signal
  )

  if (!accounts?.length) {
    const loginMethod = (provider as WaapProvider).getLoginMethod?.()
    if (loginMethod === 'waap' || loginMethod === 'human') {
      throw new Error('La sesión de Human Tech expiró. Vuelve a iniciar sesión.')
    }
    accounts = await requestWalletWithTimeout<string[]>(
      provider,
      { method: 'eth_requestAccounts' },
      Math.max(1_000, deadline - Date.now()),
      timeoutMessage,
      signal
    )
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
  params: [unknown, string],
  timeoutMs: number,
  signal?: AbortSignal
): Promise<string> {
  return requestWalletWithTimeout<string>(
    provider,
    { method: 'personal_sign', params },
    timeoutMs,
    'La firma tardó demasiado. Revisa si hay un popup de wallet bloqueado e intenta de nuevo.',
    signal
  )
}

/**
 * Try multiple signing strategies — WaaP / MetaMask / WalletConnect vary in what they accept.
 */
export async function signSiweMessage(
  waapProvider: unknown,
  message: string,
  address: string,
  signal?: AbortSignal
): Promise<string> {
  const signerAddress = getAddress(address)
  const signingProvider = resolveSigningProvider(waapProvider)
  const loginMethod = (waapProvider as WaapProvider).getLoginMethod?.()
  const errors: string[] = []
  const hexMessage = stringToHex(message)
  const deadline = Date.now() + SIWE_SIGN_TIMEOUT_MS

  const remainingMs = () => Math.max(1_000, deadline - Date.now())
  const isHangTimeout = (error: unknown) =>
    error instanceof Error && error.message.includes('tardó demasiado')

  // WaaP MPC + WalletConnect: personal_sign(hex, address) is the reliable path.
  // viem signMessage through the WaaP proxy often returns sigs that fail recovery.
  const preferPersonalSign =
    loginMethod === 'waap' ||
    loginMethod === 'human' ||
    loginMethod === 'walletconnect' ||
    signingProvider === waapProvider

  const embeddedWaap = loginMethod === 'waap' || loginMethod === 'human'
  const personalSignAttempts: [unknown, string][] = embeddedWaap
    ? [[hexMessage, signerAddress]]
    : preferPersonalSign
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
          params,
          remainingMs(),
          signal
        )
        return normalizeSignature(sig)
      } catch (error) {
        errors.push(`personal_sign: ${formatSignError(error)}`)
        // Never queue another wallet prompt after rejection or a stuck provider.
        if (isUserRejectedSignError(error)) throw error
        if (isHangTimeout(error) || signal?.aborted) break
      }
    }
  }

  // The documented WaaP 2.3 signature shape is unambiguous. Retrying it through
  // viem would enqueue a second Human Tech modal for the same SIWE request.
  if (embeddedWaap) {
    console.error('[auth] WaaP SIWE signing failed:', errors)
    throw new SignMessageError(errors)
  }

  // viem signMessage (works well for injected MetaMask)
  try {
    const sig = await withSignTimeout(
      signWithViem(signingProvider, message, signerAddress),
      remainingMs()
    )
    return normalizeSignature(sig)
  } catch (error) {
    errors.push(`viem: ${formatSignError(error)}`)
  }

  if (!preferPersonalSign) {
    for (const params of personalSignAttempts) {
      try {
        const sig = await signWithPersonalSign(
          signingProvider,
          params,
          remainingMs(),
          signal
        )
        return normalizeSignature(sig)
      } catch (error) {
        errors.push(`personal_sign: ${formatSignError(error)}`)
        if (isUserRejectedSignError(error)) throw error
        if (isHangTimeout(error) || signal?.aborted) break
      }
    }
  }

  // Fallback: original WaaP provider if we tried injected
  if (signingProvider !== waapProvider) {
    try {
      const sig = await withSignTimeout(
        signWithViem(waapProvider, message, signerAddress),
        remainingMs()
      )
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
    const hung = attempts.some((attempt) => attempt.includes('tardó demasiado'))
    super(
      hung
        ? 'La firma no respondió. Revisa si hay un popup de wallet bloqueado, o recarga e intenta de nuevo.'
        : 'No se pudo firmar el mensaje. Si usas MetaMask, ábrela y acepta la solicitud. ' +
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
