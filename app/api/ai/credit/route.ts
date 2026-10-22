import { NextRequest, NextResponse } from 'next/server'
import { getCreditSnapshot } from '@/lib/ai-credit-store'
import { formatCreditNote } from '@/lib/ai-credit'
import { handleAuthError, requireSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }
    const credit = await getCreditSnapshot(session.userId)
    return NextResponse.json({ ...credit, note: formatCreditNote(credit) })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}
