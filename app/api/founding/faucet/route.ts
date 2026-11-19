import { NextResponse } from 'next/server'
import {
  foundingWaitlistClientKey,
  foundingWaitlistPostRateLimited,
} from '@/lib/founding/rate-limit'
import { verifyFoundingFaucetProof } from '@/lib/founding/faucet-proof'
import { isFoundingFaucetEnabled, sendFoundingFaucetCelo } from '@/lib/founding/send-faucet-celo'

export async function POST(req: Request) {
  const clientKey = foundingWaitlistClientKey(req)
  if (foundingWaitlistPostRateLimited(clientKey)) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    address?: string
    signature?: string
    issuedAt?: string
  }

  const address = body.address?.trim() || ''
  const signature = body.signature?.trim() || ''
  const issuedAt = body.issuedAt?.trim() || ''

  if (!address || !signature || !issuedAt) {
    return NextResponse.json({ ok: false, error: 'Wallet proof required' }, { status: 400 })
  }

  try {
    verifyFoundingFaucetProof({ address, signature, issuedAt })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Invalid proof' },
      { status: 400 }
    )
  }

  if (!isFoundingFaucetEnabled()) {
    return NextResponse.json({ ok: false, error: 'Faucet disabled' }, { status: 503 })
  }

  try {
    const result = await sendFoundingFaucetCelo(address)
    if (!result.sent) {
      return NextResponse.json({
        ok: true,
        success: true,
        skipped: true,
        reason: result.reason,
        to: address,
      })
    }
    return NextResponse.json({
      ok: true,
      success: true,
      txHash: result.txHash,
      amount: result.amount,
      to: address,
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Faucet failed' },
      { status: 500 }
    )
  }
}