import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { handleAuthError } from '@/lib/auth/errors'
import {
  ensureLegacyUserHasPrimaryLink,
  listLinkedWalletsForUser,
} from '@/lib/auth/linked-wallets'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Registration required' }, { status: 403 })
    }

    await ensureLegacyUserHasPrimaryLink(session.userId)
    const wallets = await listLinkedWalletsForUser(session.userId)

    return NextResponse.json({
      wallets,
      primaryAddress:
        wallets.find((w) => w.isPrimary)?.address ?? session.eoaAddress,
      sessionEoa: session.eoaAddress,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}