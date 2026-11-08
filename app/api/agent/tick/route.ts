import { NextRequest, NextResponse } from 'next/server'
import { runAgentTick } from '@/lib/escrow/agent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

async function handle(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured' },
      { status: 503 }
    )
  }

  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json(await runAgentTick())
  } catch (error) {
    console.error('[agent/tick]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'tick failed' },
      { status: 500 }
    )
  }
}

export const GET = handle
export const POST = handle
