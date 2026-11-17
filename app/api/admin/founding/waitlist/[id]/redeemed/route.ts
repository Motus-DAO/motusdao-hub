import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/admin-route'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  const { id } = await context.params
  const updated = await prisma.foundingWaitlistEntry.update({
    where: { id },
    data: { status: 'redeemed' },
  }).catch(() => null)

  if (!updated) {
    return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ success: true, status: updated.status })
}