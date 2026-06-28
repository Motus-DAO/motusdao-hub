import { NextResponse } from 'next/server'
import { isDevAdminBypassEnabled } from '@/lib/auth/dev-bypass'

/** Dev-only: tells the admin UI whether auth bypass is active. */
export async function GET() {
  return NextResponse.json({ enabled: isDevAdminBypassEnabled() })
}
