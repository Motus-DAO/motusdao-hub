import { getAddress, type Address } from 'viem'

export type Eip1193Like = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>
}

/**
 * Prefer eth_accounts (no prompt) before eth_requestAccounts — avoids 4100 on repeat mints
 * when the user is already connected via WaaP context but window.waap would re-prompt.
 */
export async function resolveEip1193SignerAddress(
  provider: Eip1193Like,
  preferred?: Address | string | null
): Promise<Address | null> {
  try {
    let accounts = (await provider.request({
      method: 'eth_accounts',
      params: [],
    })) as string[]

    if (!accounts?.length) {
      accounts = (await provider.request({
        method: 'eth_requestAccounts',
        params: [],
      })) as string[]
    }

    if (!accounts?.length) return null

    if (preferred) {
      const want = preferred.toLowerCase()
      const match = accounts.find((a) => a.toLowerCase() === want)
      if (match) return getAddress(match)
    }

    return getAddress(accounts[0])
  } catch {
    return null
  }
}