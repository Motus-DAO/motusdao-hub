import { authFetch } from '@/lib/auth/client'
import { getActiveSignerAddress, signSiweMessage } from '@/lib/auth/signing'

export type LinkedWalletDto = {
  id: string
  address: string
  label: string | null
  isPrimary: boolean
  linkedAt: string
  lastUsedAt: string | null
}

export async function fetchLinkedWallets(): Promise<{
  wallets: LinkedWalletDto[]
  primaryAddress: string
  sessionEoa: string
}> {
  const res = await authFetch('/api/auth/wallets')
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'No se pudo cargar las wallets')
  }
  return res.json()
}

async function signSiweStepUpMessage(
  provider: unknown,
  eoaAddress: string
): Promise<{ message: string; signature: string }> {
  const nonceResponse = await authFetch(
    `/api/auth/nonce?address=${encodeURIComponent(eoaAddress)}`
  )
  if (!nonceResponse.ok) {
    const body = await nonceResponse.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string }).error ?? 'Failed to request SIWE nonce'
    )
  }
  const { message } = await nonceResponse.json()
  const active = await getActiveSignerAddress(provider)
  const signature = await signSiweMessage(provider, message, active)
  return { message, signature }
}

export async function linkWalletWithSiwe(
  provider: unknown,
  eoaAddress: string,
  label?: string
): Promise<LinkedWalletDto> {
  const { message, signature } = await signSiweStepUpMessage(provider, eoaAddress)
  const res = await authFetch('/api/auth/wallets/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, signature, label }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'No se pudo vincular la wallet')
  }
  const data = (await res.json()) as { wallet: LinkedWalletDto }
  return data.wallet
}

export async function unlinkWalletWithSiwe(
  provider: unknown,
  address: string
): Promise<void> {
  const { message, signature } = await signSiweStepUpMessage(provider, address)
  const res = await authFetch('/api/auth/wallets/unlink', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, message, signature }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'No se pudo desvincular la wallet')
  }
}