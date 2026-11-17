import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/admin-route'
import { parseFoundingRole } from '@/lib/founding/constants'
import { listFoundingAdmin } from '@/lib/founding/store'

export async function GET(request: NextRequest) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  const roleParam = request.nextUrl.searchParams.get('role') ?? 'user'
  const role = parseFoundingRole(roleParam)
  if (!role) {
    return NextResponse.json({ error: 'role debe ser user o psm.' }, { status: 400 })
  }

  try {
    const data = await listFoundingAdmin(role)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[admin/founding/waitlist]', error)
    const message =
      error instanceof Error ? error.message : 'No se pudo cargar la lista fundadora.'
    const migrationHint =
      '¿Corriste `npx prisma migrate deploy`? Tablas founding_waitlist_* deben existir.'
    return NextResponse.json(
      { error: `${message} ${migrationHint}` },
      { status: 503 }
    )
  }
}