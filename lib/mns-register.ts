import type { Address } from 'viem'
import { encodeFunctionData } from 'viem'
import { MNS_ABI, MNS_CONTRACT_ADDRESS } from './motus-name-service'

export interface WaaPRegisterResult {
  success: boolean
  txHash?: string
  error?: string
}

type WaaPLike = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>
}

function getWaaP(): WaaPLike | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { waap?: WaaPLike }).waap ?? null
}

/**
 * Simple direct registration:
 * - Uses WaaP EOA as signer
 * - Sends a single registerName(name, targetAddress) tx
 * - User pays gas with their own CELO balance
 */
export async function registerMotusNameWithWaaP(
  name: string,
  targetAddress: Address,
): Promise<WaaPRegisterResult> {
  try {
    const waap = getWaaP()
    if (!waap) {
      return { success: false, error: 'WaaP no está disponible (window.waap).' }
    }

    const normalizedName = name.replace('.motus', '')

    // 1) Get connected WaaP account
    const accounts = (await waap.request({ method: 'eth_requestAccounts', params: [] })) as string[]
    if (!accounts?.length) {
      return { success: false, error: 'No hay cuenta WaaP conectada. Inicia sesión primero.' }
    }
    const from = accounts[0] as Address

    // 2) Encode registerName(name, targetAddress)
    const data = encodeFunctionData({
      abi: MNS_ABI,
      functionName: 'registerName',
      args: [normalizedName, targetAddress],
    })

    // 3) Send transaction via WaaP; WaaP will show the confirmation modal
    // and broadcast the tx to Celo. We expect a tx hash back.
    const txHash = (await waap.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from,
          to: MNS_CONTRACT_ADDRESS,
          data,
          value: '0x0',
        },
      ],
    })) as string

    return {
      success: true,
      txHash,
    }
  } catch (error) {
    console.error('[MNS simple register] Error:', error)
    const msg = error instanceof Error ? error.message : String(error)

    if (msg.toLowerCase().includes('insufficient funds')) {
      return {
        success: false,
        error: 'No tienes suficiente CELO para gas. Reclama CELO del faucet primero.',
      }
    }

    if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied')) {
      return {
        success: false,
        error: 'Rechazaste la transacción en WaaP.',
      }
    }

    return {
      success: false,
      error: msg,
    }
  }
}

