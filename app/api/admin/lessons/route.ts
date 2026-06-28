import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/admin-route'

/** Lesson creation must always be scoped through /api/admin/modules/[moduleId]/lessons. */
export async function POST(request: NextRequest) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  return NextResponse.json(
    { error: 'moduleId es obligatorio para crear una lección' },
    { status: 400 }
  )
}
