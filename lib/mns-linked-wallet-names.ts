import type { Address } from 'viem'
import { motusNameService } from '@/lib/motus-name-service'

export function normalizeMotusLabel(name: string): string {
  return name.replace(/\.motus$/i, '').trim()
}

export function dedupeAddresses(addresses: string[]): string[] {
  const seen = new Set<string>()
  return addresses.filter((addr) => {
    const key = addr.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export type MotusNameEntry = {
  walletAddress: string
  name: string
  payoutAddress: string | null
  source: 'reverse' | 'account_db'
  isSessionWallet: boolean
}

export async function loadMotusNamesForWallets(input: {
  walletAddresses: string[]
  sessionEoa?: string | null
  accountMotusName?: string | null
  accountPrimaryEoa?: string | null
}): Promise<MotusNameEntry[]> {
  const addresses = dedupeAddresses(input.walletAddresses.filter(Boolean))
  const session = input.sessionEoa?.toLowerCase() ?? null
  const entries: MotusNameEntry[] = []
  const namesSeen = new Set<string>()

  for (const walletAddress of addresses) {
    const reverse = await motusNameService.reverseLookup(walletAddress as Address)
    if (!reverse) continue
    const label = normalizeMotusLabel(reverse)
    const key = label.toLowerCase()
    if (namesSeen.has(key)) continue
    namesSeen.add(key)
    const payout = await motusNameService.resolve(label)
    entries.push({
      walletAddress,
      name: label,
      payoutAddress: payout,
      source: 'reverse',
      isSessionWallet: session === walletAddress.toLowerCase(),
    })
  }

  const dbName = input.accountMotusName
    ? normalizeMotusLabel(input.accountMotusName)
  : null
  if (dbName && !namesSeen.has(dbName.toLowerCase())) {
    namesSeen.add(dbName.toLowerCase())
    const payout = await motusNameService.resolve(dbName)
    const wallet =
      input.accountPrimaryEoa && input.accountPrimaryEoa.length > 0
        ? input.accountPrimaryEoa
        : addresses[0] ?? ''
    entries.push({
      walletAddress: wallet,
      name: dbName,
      payoutAddress: payout,
      source: 'account_db',
      isSessionWallet: Boolean(session && wallet.toLowerCase() === session),
    })
  }

  return entries
}