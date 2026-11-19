'use client'

import { buildFoundingFaucetMessage } from '@/lib/founding/faucet-proof'
import { signSiweMessage } from '@/lib/auth/signing'

export async function signFoundingFaucetProof(address: string, waapProvider: unknown) {
  const issuedAt = new Date().toISOString()
  const message = buildFoundingFaucetMessage(address, issuedAt)
  const signature = await signSiweMessage(waapProvider, message, address)
  return { address, signature, issuedAt }
}

export async function claimFoundingFaucetCelo(input: {
  address: string
  signature: string
  issuedAt: string
}) {
  const res = await fetch('/api/founding/faucet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return res.json() as Promise<{
    ok?: boolean
    success?: boolean
    error?: string
    txHash?: string
    amount?: string
    skipped?: boolean
    reason?: string
  }>
}