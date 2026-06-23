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
import { MNS_ABI, MNS_CONTRACT_ADDRESS, motusNameService } from './motus-name-service'

export interface WaaPRegisterResult {
  success: boolean
  txHash?: string
  error?: string
  alreadyRegistered?: boolean
}

type WaaPLike = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>
}

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

function normalizeWalletError(message: string): string {
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

  if (lower.includes('transfer amount exceeds balance') || lower.includes('erc20')) {
    return 'No tienes suficiente cUSD para registrar el dominio.'
  }

  return message
}

async function sendWaaPTransaction(
  waap: WaaPLike,
  from: Address,
  to: Address,
  data: `0x${string}`
): Promise<string> {
  const client = getPublicClient()
  const { params } = await buildCeloWaaPTransaction(client, from, to, data)

  console.log('[MNS] Sending WaaP tx on Celo with explicit gas:', {
    gas: params.gas,
    gasPrice: params.gasPrice,
  })

  return (await waap.request({
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

/** WaaP-only registration on Celo (no ZeroDev / Pimlico). */
export async function registerMotusName(
  name: string,
  targetAddress: Address
): Promise<WaaPRegisterResult> {
  return registerMotusNameWithWaaP(name, targetAddress)
}

/**
 * Direct registration on Celo via WaaP EOA:
 * - switches to Celo Mainnet
 * - uses Celo-native gas/fee estimates (not Ethereum defaults)
 * - approves cUSD only when on-chain price > 0
 */
export async function registerMotusNameWithWaaP(
  name: string,
  targetAddress: Address
): Promise<WaaPRegisterResult> {
  try {
    const waap = getWaaP()
    if (!waap) {
      return { success: false, error: 'WaaP no está disponible (window.waap).' }
    }

    const normalizedName = name.replace('.motus', '')
    const client = getPublicClient()

    await ensureCeloNetwork(waap)

    const accounts = (await waap.request({
      method: 'eth_requestAccounts',
      params: [],
    })) as string[]

    if (!accounts?.length) {
      return { success: false, error: 'No hay cuenta WaaP conectada. Inicia sesión primero.' }
    }

    const from = accounts[0] as Address
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
    const waapPerTxBuffer = parseEther('0.13')
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
        address: CELO_STABLE_TOKENS.cUSD,
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
        address: CELO_STABLE_TOKENS.cUSD,
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
          waap,
          from,
          CELO_STABLE_TOKENS.cUSD as Address,
          approveData
        )

        await waitForTransaction(approveTxHash)
      }
    }

    const txHash = await sendWaaPTransaction(
      waap,
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
    const msg = error instanceof Error ? error.message : String(error)

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
      error: normalizeWalletError(msg),
    }
  }
}
