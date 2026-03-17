import type { Address } from 'viem'
import { createPublicClient, http, encodeFunctionData, formatUnits, keccak256 } from 'viem'
import { celoMainnet, CELO_STABLE_TOKENS } from '@/lib/celo'
import { MNS_ABI, MNS_CONTRACT_ADDRESS } from './motus-name-service'

export interface WaaPRegisterResult {
  success: boolean
  txHash?: string
  error?: string
}

const CELO_CHAIN_ID_HEX = '0xa4ec' // 42220
const CELO_RPC = 'https://forno.celo.org'

const CELO_CHAIN_PARAMS = {
  chainId: CELO_CHAIN_ID_HEX,
  chainName: 'Celo',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: [CELO_RPC],
  blockExplorerUrls: ['https://celoscan.io'],
}

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
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

function getWaaP(): any | null {
  if (typeof window === 'undefined') return null
  return (window as any).waap ?? null
}

function getCeloPublicClient() {
  return createPublicClient({
    chain: celoMainnet,
    transport: http(CELO_RPC),
  })
}

async function ensureCeloChain(waap: any): Promise<void> {
  try {
    await waap.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CELO_CHAIN_ID_HEX }],
    })
  } catch (err: any) {
    if (err?.code === 4902 || err?.message?.includes('Unrecognized chain')) {
      await waap.request({
        method: 'wallet_addEthereumChain',
        params: [CELO_CHAIN_PARAMS],
      })
    }
  }
}

/**
 * Sign the tx via WaaP (async mode) and broadcast it ourselves to Celo RPC,
 * bypassing the WaaP gas tank relay which is currently unreachable.
 */
async function signAndBroadcast(
  waap: any,
  txParams: { from: string; to: string; data: string; value: string },
): Promise<string> {
  const publicClient = getCeloPublicClient()

  // Set up listener BEFORE triggering the request
  const signedTxPromise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Timeout esperando firma (2 min). Intenta de nuevo.'))
    }, 120_000)

    function cleanup() {
      clearTimeout(timeout)
      try {
        waap.removeListener('waap_sign_complete', onComplete)
        waap.removeListener('waap_sign_failed', onFailed)
      } catch { /* listeners may not exist */ }
    }

    function onComplete(event: { pendingTxId: string; serializedTx: string | null }) {
      cleanup()
      if (event.serializedTx) {
        resolve(event.serializedTx)
      } else {
        reject(new Error('WaaP firmó pero no devolvió la transacción serializada.'))
      }
    }

    function onFailed(event: { pendingTxId: string; error: string }) {
      cleanup()
      reject(new Error(event.error || 'Error al firmar la transacción en WaaP.'))
    }

    waap.on('waap_sign_complete', onComplete)
    waap.on('waap_sign_failed', onFailed)
  })

  // Send tx in async mode: WaaP will sign it, modal closes after user confirms.
  // We DON'T rely on WaaP's broadcast (which routes through the broken gas tank).
  console.log('[MNS] Requesting WaaP signature (async mode)...')
  await waap.request({
    method: 'eth_sendTransaction',
    params: [txParams],
    async: true,
  })

  // Wait for the signed tx from the event
  const serializedTx = await signedTxPromise
  console.log('[MNS] Got signed tx, broadcasting directly to Celo RPC...')

  // Derive the tx hash from the serialized tx (keccak256 of the raw bytes)
  const derivedTxHash = keccak256(serializedTx as `0x${string}`)

  // Try to broadcast via direct RPC.
  // WaaP may have already broadcast it through its own path — if so the RPC
  // returns "already known" which is fine: the tx is in the mempool.
  try {
    const txHash = await publicClient.request({
      method: 'eth_sendRawTransaction',
      params: [serializedTx as `0x${string}`],
    })
    console.log('[MNS] Broadcast successful:', txHash)
    return txHash as string
  } catch (broadcastErr: any) {
    const errMsg = broadcastErr?.message || broadcastErr?.details || String(broadcastErr)
    if (errMsg.includes('already known') || errMsg.includes('nonce too low') || errMsg.includes('already exists')) {
      console.log('[MNS] Tx already broadcast by WaaP, using derived hash:', derivedTxHash)
      return derivedTxHash
    }
    throw broadcastErr
  }
}

/**
 * Register a .motus name. Simple flow:
 * 1. WaaP signs the transaction
 * 2. We broadcast it directly to the Celo RPC
 * 3. User pays gas with their CELO
 */
export async function registerMotusNameWithWaaPGasTank(
  name: string,
  targetAddress: Address,
): Promise<WaaPRegisterResult> {
  try {
    const waap = getWaaP()
    if (!waap) {
      return { success: false, error: 'WaaP no está disponible (window.waap).' }
    }

    const normalizedName = name.replace('.motus', '')

    // 1) Get connected account
    const accounts = (await waap.request({ method: 'eth_requestAccounts' })) as string[]
    if (!accounts?.length) {
      return { success: false, error: 'No hay cuenta WaaP conectada. Inicia sesión primero.' }
    }
    const from = accounts[0] as Address
    console.log('[MNS] Connected account:', from)

    // 2) Switch wallet to Celo
    await ensureCeloChain(waap)

    // 3) Preflight checks via direct RPC
    const publicClient = getCeloPublicClient()

    const celoBalance = await publicClient.getBalance({ address: from })
    console.log('[MNS] CELO balance:', formatUnits(celoBalance, 18))
    if (celoBalance === 0n) {
      return {
        success: false,
        error: 'Tu wallet no tiene CELO para gas. Reclama CELO del faucet primero (paso 1).',
      }
    }

    // 4) Check registration price
    const registrationPrice = (await publicClient.readContract({
      address: MNS_CONTRACT_ADDRESS,
      abi: MNS_ABI,
      functionName: 'registrationPrice',
    })) as bigint
    console.log('[MNS] Registration price:', formatUnits(registrationPrice, 18), 'cUSD')

    // 5) If price > 0, handle cUSD approval first
    if (registrationPrice > 0n) {
      const cUSD = CELO_STABLE_TOKENS.cUSD as Address
      const cUSDBalance = (await publicClient.readContract({
        address: cUSD,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [from],
      })) as bigint

      if (cUSDBalance < registrationPrice) {
        return {
          success: false,
          error: `Necesitas ${formatUnits(registrationPrice, 18)} cUSD pero tienes ${formatUnits(cUSDBalance, 18)} cUSD.`,
        }
      }

      const allowance = (await publicClient.readContract({
        address: cUSD,
        abi: ERC20_BALANCE_ABI,
        functionName: 'allowance',
        args: [from, MNS_CONTRACT_ADDRESS],
      })) as bigint

      if (allowance < registrationPrice) {
        console.log('[MNS] Approving cUSD...')
        const approveData = encodeFunctionData({
          abi: ERC20_BALANCE_ABI,
          functionName: 'approve',
          args: [MNS_CONTRACT_ADDRESS, registrationPrice],
        })

        const approveTxHash = await signAndBroadcast(waap, {
          from,
          to: cUSD,
          data: approveData,
          value: '0x0',
        })
        await publicClient.waitForTransactionReceipt({ hash: approveTxHash as `0x${string}` })
        console.log('[MNS] cUSD approved')
      }
    }

    // 6) Encode registerName(name, targetAddress)
    const calldata = encodeFunctionData({
      abi: MNS_ABI,
      functionName: 'registerName',
      args: [normalizedName, targetAddress],
    })

    // 7) Sign via WaaP + broadcast directly to Celo RPC
    console.log('[MNS] Registering name:', normalizedName)
    const txHash = await signAndBroadcast(waap, {
      from,
      to: MNS_CONTRACT_ADDRESS,
      data: calldata,
      value: '0x0',
    })

    // 8) Wait for on-chain confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
    })
    console.log('[MNS] Confirmed in block:', receipt.blockNumber)

    return {
      success: true,
      txHash: receipt.transactionHash,
    }
  } catch (error) {
    console.error('[MNS] Registration error:', error)
    const msg = error instanceof Error ? error.message : String(error)

    if (msg.includes('user rejected') || msg.includes('User rejected') || msg.includes('User denied')) {
      return {
        success: false,
        error: 'Rechazaste la transacción. Inténtalo de nuevo y presiona "Confirm".',
      }
    }

    if (msg.includes('insufficient funds') || msg.includes('Insufficient funds')) {
      return {
        success: false,
        error: 'No tienes suficiente CELO para gas. Reclama CELO del faucet primero.',
      }
    }

    return {
      success: false,
      error: msg,
    }
  }
}
