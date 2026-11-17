import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/admin-route'
import { requireAdmin, handleAuthError } from '@/lib/auth/session'
import { hardDeleteFoundingEntry } from '@/lib/founding/store'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, context: RouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const session = await requireAdmin(request)
    const { id } = await context.params
    const adminWallet = session.eoaAddress ?? 'unknown'
    const result = await hardDeleteFoundingEntry(id, adminWallet)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    const auth = handleAuthError(error)
    if (auth) return auth
    console.error('founding delete', error)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}