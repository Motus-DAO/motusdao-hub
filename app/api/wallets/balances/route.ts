import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { handleAuthError, AuthError } from '@/lib/auth/errors'
import {
  ensureLegacyUserHasPrimaryLink,
  listLinkedWalletsForUser,
} from '@/lib/auth/linked-wallets'
import { fetchLinkedWalletBalancesForAddress } from '@/lib/wallet-balances-server'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      throw new AuthError(403, 'Registration required')
    }

    await ensureLegacyUserHasPrimaryLink(session.userId)
    const linked = await listLinkedWalletsForUser(session.userId)

    const wallets = await Promise.all(
      linked.map(async (row) => {
        const snapshot = await fetchLinkedWalletBalancesForAddress(row.address)
        return {
          id: row.id,
          address: row.address,
          isPrimary: row.isPrimary,
          isSessionWallet:
            row.address.toLowerCase() === session.eoaAddress.toLowerCase(),
          balances: snapshot.balances,
          error: snapshot.error ?? null,
        }
      })
    )

    return NextResponse.json({
      sessionEoa: session.eoaAddress,
      sessionAuthProvider: session.authProvider,
      wallets,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    const message = error instanceof Error ? error.message : 'Balances failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}