import { createWalletClient, createPublicClient, custom, http, parseUnits, encodeFunctionData, maxUint256, type Address, type Hex } from 'viem'
import { celoMainnet, CELO_STABLE_TOKENS, getCeloTokenDecimals, type PaymentCurrency } from './celo'
import { getCeloExplorerUrl } from './celo'
import { getAttributionSuffix } from './attribution'
import { ensureCeloNetwork } from './celo-waap'
import type { SessionPaymentContext } from './payment-session'
import { normalizeSessionPaymentAddress } from './payment-session'

export type { PaymentCurrency }
export type { SessionPaymentContext } from './payment-session'

/**
 * On-chain spend uses the SIWE session wallet (P1) via its EIP-1193 provider (P6).
 */

export interface PaymentParams {
  from: Address
  to: Address
  amount: string
  currency: PaymentCurrency
}

export interface PaymentResult {
  success: boolean
  transactionHash?: string
  error?: string
  explorerUrl?: string
}

function assertPaymentFromSession(
  ctx: SessionPaymentContext,
  from: Address
): void {
  if (
    normalizeSessionPaymentAddress(from) !==
    normalizeSessionPaymentAddress(ctx.address)
  ) {
    throw new Error('El pago debe salir de la wallet de tu sesión actual.')
  }
}

export async function createEoaWalletClient(ctx: SessionPaymentContext) {
  await ensureCeloNetwork(
    ctx.eip1193Provider as Parameters<typeof ensureCeloNetwork>[0]
  )

  const dataSuffix = getAttributionSuffix()

  return createWalletClient({
    account: ctx.address,
    chain: celoMainnet,
    transport: custom(ctx.eip1193Provider as Parameters<typeof custom>[0]),
    ...(dataSuffix ? { dataSuffix } : {}),
  })
}

export async function sendCELOPayment(
  ctx: SessionPaymentContext,
  params: PaymentParams
): Promise<PaymentResult> {
  try {
    assertPaymentFromSession(ctx, params.from)
    const walletClient = await createEoaWalletClient(ctx)
    const amountInWei = parseUnits(params.amount, 18)

    const hash = await walletClient.sendTransaction({
      to: params.to,
      value: amountInWei,
    })

    return {
      success: true,
      transactionHash: hash,
      explorerUrl: getCeloExplorerUrl(hash, 'tx'),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    }
  }
}

export async function sendStablecoinPayment(
  ctx: SessionPaymentContext,
  params: PaymentParams
): Promise<PaymentResult> {
  try {
    assertPaymentFromSession(ctx, params.from)

    const walletClient = await createEoaWalletClient(ctx)

    const tokenAddress = CELO_STABLE_TOKENS[params.currency as keyof typeof CELO_STABLE_TOKENS]
    if (!tokenAddress) {
      return {
        success: false,
        error: `Token no soportado: ${params.currency}`,
      }
    }

    const amountInWei = parseUnits(params.amount, getCeloTokenDecimals(params.currency))

    const data = encodeFunctionData({
      abi: [
        {
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ],
      functionName: 'transfer',
      args: [params.to, amountInWei],
    })

    const hash = await walletClient.sendTransaction({
      to: tokenAddress,
      data,
    })

    return {
      success: true,
      transactionHash: hash,
      explorerUrl: getCeloExplorerUrl(hash, 'tx'),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    }
  }
}

const celoPublicClient = createPublicClient({
  chain: celoMainnet,
  transport: http(),
})

export async function sendUnsignedEvmTx(
  ctx: SessionPaymentContext,
  tx: { to: string; data: string; value?: string },
  options?: { wait?: boolean }
): Promise<PaymentResult> {
  try {
    const walletClient = await createEoaWalletClient(ctx)
    const hash = await walletClient.sendTransaction({
      to: tx.to as Address,
      data: tx.data as Hex,
      value: BigInt(tx.value || '0'),
    })

    if (options?.wait !== false) {
      const receipt = await celoPublicClient.waitForTransactionReceipt({ hash })
      if (receipt.status === 'reverted') {
        return {
          success: false,
          transactionHash: hash,
          explorerUrl: getCeloExplorerUrl(hash, 'tx'),
          error:
            'La transacción se revirtió on-chain. Si era un swap Textile, la cotización RFQ (~30 s) probablemente expiró. Vuelve a confirmar: la aprobación ya debería estar hecha.',
        }
      }
    }

    return {
      success: true,
      transactionHash: hash,
      explorerUrl: getCeloExplorerUrl(hash, 'tx'),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    }
  }
}

const ERC20_ALLOWANCE_ABI = [
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
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export async function ensureErc20Allowance(params: {
  ctx: SessionPaymentContext
  owner: Address
  token: Address
  spender: Address
  required: bigint
}): Promise<PaymentResult & { skipped?: boolean }> {
  try {
    if (
      normalizeSessionPaymentAddress(params.owner) !==
      normalizeSessionPaymentAddress(params.ctx.address)
    ) {
      throw new Error('El allowance debe ser de la wallet de tu sesión actual.')
    }

    const allowance = (await celoPublicClient.readContract({
      address: params.token,
      abi: ERC20_ALLOWANCE_ABI,
      functionName: 'allowance',
      args: [params.owner, params.spender],
    })) as bigint

    if (allowance >= params.required) {
      return { success: true, skipped: true }
    }

    const data = encodeFunctionData({
      abi: ERC20_ALLOWANCE_ABI,
      functionName: 'approve',
      args: [params.spender, maxUint256],
    })

    return sendUnsignedEvmTx(
      params.ctx,
      { to: params.token, data, value: '0' },
      { wait: true }
    )
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo revisar el allowance',
    }
  }
}