import type { Address } from 'viem'
import {
  createPublicClient,
  encodeFunctionData,
  formatEther,
  http,
  parseEther,
  parseUnits,
} from 'viem'
import { celoMainnet, CELO_STABLE_TOKENS } from './celo'
import { buildCeloWaaPTransaction, ensureCeloNetwork } from './celo-waap'
import {
  resolveEip1193SignerAddress,
  type Eip1193Like,
} from '@/lib/wallet/eip1193-accounts'
import { resolveSigningProvider } from '@/lib/auth/signing'
import { appendAttributionData } from './attribution'
import { MNS_ABI, MNS_CONTRACT_ADDRESS, motusNameService } from './motus-name-service'

export interface FaucetResult {
  success: boolean
  amount?: string
  txHash?: string
  error?: string
  retryInMinutes?: number
  skipped?: boolean
}

/** CELO buffer WaaP reserves per on-chain tx on Celo. */
export const WAAP_CELO_PER_TX = parseEther('0.13')

export async function getCeloBalance(address: Address): Promise<bigint> {
  const client = getPublicClient()
  return client.getBalance({ address })
}

export async function getRequiredCeloForMnsRegistration(): Promise<bigint> {
  const priceStr = await motusNameService.getRegistrationPrice()
  const price = parseUnits(priceStr, 18)
  const txCount = price > BigInt(0) ? 2 : 1
  return WAAP_CELO_PER_TX * BigInt(txCount)
}

/** Poll until CELO balance meets threshold (post-faucet propagation). */
async function waitForCeloBalance(
  address: Address,
  required: bigint,
  timeoutMs = 30_000
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const balance = await getCeloBalance(address)
    if (balance >= required) return true
    await new Promise((resolve) => setTimeout(resolve, 2_000))
  }

  return (await getCeloBalance(address)) >= required
}

export async function resolveWaaPSigningAddress(
  provider?: unknown
): Promise<Address | null> {
  const signer = (provider as Eip1193Like | undefined) ?? getWaaP()
  if (!signer) return null
  return resolveEip1193SignerAddress(signer)
}

/**
 * Request CELO from the onboarding faucet when balance is below the MNS threshold.
 * Skips the API call if the wallet already has enough CELO.
 */
export async function ensureFaucetCeloForMns(address: Address): Promise<FaucetResult> {
  try {
    const required = await getRequiredCeloForMnsRegistration()
    const balance = await getCeloBalance(address)

    if (balance >= required) {
      return { success: true, skipped: true }
    }

    const res = await fetch('/api/faucet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ address }),
    })
    const body = await res.json()

    if (!res.ok || !body.success) {
      if (res.status === 429) {
        const balanceAfterRateLimit = await getCeloBalance(address)
        if (balanceAfterRateLimit >= required) {
          return { success: true, skipped: true }
        }
        if (body.retryInMinutes) {
          return {
            success: false,
            error: `Ya reclamaste CELO recientemente. Intenta en ~${body.retryInMinutes} minutos.`,
            retryInMinutes: body.retryInMinutes,
          }
        }
      }
      const rawError =
        typeof body.error === 'string'
          ? body.error
          : typeof body.message === 'string'
            ? body.message
            : 'Error al solicitar CELO del faucet'
      const error =
        rawError === 'Authentication required'
          ? 'Sin sesión del Hub. Firma el mensaje SIWE (no cuesta gas) y vuelve a intentar.'
          : rawError
      return {
        success: false,
        error,
      }
    }

    if (body.txHash) {
      const client = getPublicClient()
      await client.waitForTransactionReceipt({
        hash: body.txHash as `0x${string}`,
        timeout: 90_000,
      })

      const funded = await waitForCeloBalance(address, required)
      if (!funded) {
        return {
          success: false,
          error:
            'CELO enviado pero aún no visible en tu wallet. Espera unos segundos e intenta registrar de nuevo.',
        }
      }
    }

    return {
      success: true,
      amount: body.amount,
      txHash: body.txHash,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al solicitar CELO',
    }
  }
}

/** Founding waitlist: CELO via signed proof (Lab parity — no Hub SIWE session). */
export async function ensureFoundingFaucetCeloForMns(
  address: Address,
  waapProvider: unknown
): Promise<FaucetResult> {
  const { claimFoundingFaucetCelo, signFoundingFaucetProof } = await import(
    '@/lib/founding/faucet-client'
  )

  try {
    const required = await getRequiredCeloForMnsRegistration()
    const balance = await getCeloBalance(address)

    if (balance >= required) {
      return { success: true, skipped: true }
    }

    const proof = await signFoundingFaucetProof(address, waapProvider)
    const body = await claimFoundingFaucetCelo(proof)

    const ok = body.ok === true || body.success === true
    if (!ok) {
      return {
        success: false,
        error: typeof body.error === 'string' ? body.error : 'Error al solicitar CELO del faucet',
      }
    }

    if (body.skipped) {
      return { success: true, skipped: true }
    }

    if (body.txHash) {
      const client = getPublicClient()
      await client.waitForTransactionReceipt({
        hash: body.txHash as `0x${string}`,
        timeout: 90_000,
      })

      const funded = await waitForCeloBalance(address, required)
      if (!funded) {
        return {
          success: false,
          error:
            'CELO enviado pero aún no visible en tu wallet. Espera unos segundos e intenta registrar de nuevo.',
        }
      }
    }

    return {
      success: true,
      amount: body.amount,
      txHash: body.txHash,
    }
  } catch (error) {
    const raw =
      error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Error al solicitar CELO'
    return {
      success: false,
      error: formatWalletActionError(raw),
    }
  }
}

export interface WaaPRegisterResult {
  success: boolean
  txHash?: string
  error?: string
  alreadyRegistered?: boolean
}

type WaaPLike = Eip1193Like

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

function getWaaP(): WaaPLike | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { waap?: WaaPLike }).waap ?? null
}

function getPublicClient() {
  return createPublicClient({
    chain: celoMainnet,
    transport: http('https://forno.celo.org'),
  })
}

export function formatWalletActionError(message: string): string {
  const lower = message.toLowerCase()

  if (
    lower.includes('invalid codepoint') ||
    lower.includes('missing continuation byte') ||
    lower.includes('unexpected continuation byte')
  ) {
    return (
      'Error interno del SDK de WaaP al procesar la transacción. Recarga la página e inténtalo de nuevo.'
    )
  }

  if (
    lower.includes('insufficient funds') ||
    lower.includes('overshot')
  ) {
    return (
      'Saldo CELO insuficiente para la comisión de gas. WaaP a veces reserva ~0.12 CELO por transacción en Celo. ' +
      'Reclama más CELO del faucet (0.3 CELO), recarga la página e inténtalo de nuevo. ' +
      'También puedes omitir el dominio por ahora y pulsar "Completar Registro".'
    )
  }

  if (lower.includes('user rejected') || lower.includes('denied')) {
    return 'Rechazaste la transacción en WaaP.'
  }

  if (
    lower.includes('not been authorized') ||
    lower.includes('unauthorized') ||
    lower.includes('4100')
  ) {
    return (
      'La wallet no autorizó la firma o la transacción. Acepta el popup de tu wallet ' +
      '(WaaP, Rabby, MetaMask…) o recarga, vuelve a iniciar sesión e intenta de nuevo.'
    )
  }

  if (lower.includes('transfer amount exceeds balance') || lower.includes('erc20')) {
    return 'No tienes suficiente cUSD para registrar el dominio.'
  }

  return message
}

async function sendWaaPTransaction(
  signer: WaaPLike,
  from: Address,
  to: Address,
  data: `0x${string}`
): Promise<string> {
  const client = getPublicClient()
  const taggedData = appendAttributionData(data) ?? data
  const { params } = await buildCeloWaaPTransaction(client, from, to, taggedData)

  console.log('[MNS] Sending WaaP tx on Celo with explicit gas:', {
    gas: params.gas,
    gasPrice: params.gasPrice,
  })

  return (await signer.request({
    method: 'eth_sendTransaction',
    params: [params],
  })) as string
}

async function waitForTransaction(txHash: string): Promise<void> {
  const client = getPublicClient()
  await client.waitForTransactionReceipt({
    hash: txHash as `0x${string}`,
    timeout: 120_000,
  })
}

function formatRegisterError(error: unknown): string {
  if (error instanceof Error) return formatWalletActionError(error.message)
  if (error && typeof error === 'object' && 'message' in error) {
    return formatWalletActionError(String((error as { message: unknown }).message))
  }
  return formatWalletActionError(String(error))
}

/** WaaP-only registration on Celo (no ZeroDev / Pimlico). */
export async function registerMotusName(
  name: string,
  targetAddress: Address,
  signer?: unknown
): Promise<WaaPRegisterResult> {
  const active = (signer as Eip1193Like | undefined) ?? getWaaP()
  if (!active) {
    return {
      success: false,
      error: 'Wallet no disponible. Cierra el modal, inicia sesión de nuevo e inténtalo otra vez.',
    }
  }
  return registerMotusNameWithEip1193(name, targetAddress, active)
}

/** @deprecated use registerMotusName with explicit EIP-1193 provider */
export async function registerMotusNameWithWaaP(
  name: string,
  targetAddress: Address
): Promise<WaaPRegisterResult> {
  return registerMotusName(name, targetAddress)
}

/**
 * Direct registration on Celo via EIP-1193 (WaaP context provider or window.waap):
 * - switches to Celo Mainnet
 * - uses Celo-native gas/fee estimates (not Ethereum defaults)
 * - approves cUSD only when on-chain price > 0
 */
function resolveOnChainSigner(signer: Eip1193Like): Eip1193Like {
  return resolveSigningProvider(signer) as Eip1193Like
}

export async function registerMotusNameWithEip1193(
  name: string,
  targetAddress: Address,
  signer: Eip1193Like
): Promise<WaaPRegisterResult> {
  try {
    const normalizedName = name.replace('.motus', '')
    const client = getPublicClient()
    const txSigner = resolveOnChainSigner(signer)

    await ensureCeloNetwork(txSigner)

    const from = await resolveEip1193SignerAddress(txSigner, targetAddress)
    if (!from) {
      return { success: false, error: 'No hay cuenta conectada. Inicia sesión primero.' }
    }

    if (from.toLowerCase() !== targetAddress.toLowerCase()) {
      console.warn('[MNS] WaaP signing address differs from stored EOA:', {
        from,
        targetAddress,
      })
    }

    const celoBalance = await client.getBalance({ address: from })

    const alreadyOwned = await motusNameService.isOwnedBy(normalizedName, targetAddress)
    if (alreadyOwned) {
      return { success: true, alreadyRegistered: true }
    }

    const registerData = encodeFunctionData({
      abi: MNS_ABI,
      functionName: 'registerName',
      args: [normalizedName, targetAddress],
    })

    const priceStr = await motusNameService.getRegistrationPrice()
    const price = parseUnits(priceStr, 18)

    const { estimatedCostWei } = await buildCeloWaaPTransaction(
      client,
      from,
      MNS_CONTRACT_ADDRESS,
      registerData
    )

    // WaaP's signer reserves far more than real Celo gas (~0.12 CELO/tx). Buffer per tx.
    const waapPerTxBuffer = WAAP_CELO_PER_TX
    const txCount = price > BigInt(0) ? 2 : 1
    const requiredCelo = waapPerTxBuffer * BigInt(txCount)

    if (celoBalance < requiredCelo) {
      return {
        success: false,
        error:
          `Saldo CELO insuficiente para registrar el dominio. Tienes ${formatEther(celoBalance)} CELO; ` +
          `con WaaP necesitas al menos ~${formatEther(requiredCelo)} CELO ` +
          `(gas real ~${formatEther(estimatedCostWei)} CELO, pero el wallet reserva más). ` +
          'Reclama más CELO del faucet o continúa sin dominio.',
      }
    }

    if (price > BigInt(0)) {
      const cUsdBalance = (await client.readContract({
        address: CELO_STABLE_TOKENS.USDm,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [from],
      })) as bigint

      if (cUsdBalance < price) {
        return {
          success: false,
          error: `Necesitas ${priceStr} cUSD para registrar el dominio. Solo tienes ${formatEther(cUsdBalance)} cUSD.`,
        }
      }

      const allowance = (await client.readContract({
        address: CELO_STABLE_TOKENS.USDm,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [from, MNS_CONTRACT_ADDRESS],
      })) as bigint

      if (allowance < price) {
        const approveData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [MNS_CONTRACT_ADDRESS, price],
        })

        const approveTxHash = await sendWaaPTransaction(
          txSigner,
          from,
          CELO_STABLE_TOKENS.USDm as Address,
          approveData
        )

        await waitForTransaction(approveTxHash)
      }
    }

    const txHash = await sendWaaPTransaction(
      txSigner,
      from,
      MNS_CONTRACT_ADDRESS,
      registerData
    )

    await waitForTransaction(txHash)

    return {
      success: true,
      txHash,
    }
  } catch (error) {
    console.error('[MNS register] Error:', error)
    const msg = formatRegisterError(error)

    if (msg.toLowerCase().includes('name already taken')) {
      const owned = await motusNameService.isOwnedBy(
        name.replace('.motus', ''),
        targetAddress
      )
      if (owned) {
        return { success: true, alreadyRegistered: true }
      }
    }

    return {
      success: false,
      error: msg,
    }
  }
}
