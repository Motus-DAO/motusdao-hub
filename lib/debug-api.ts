import { NextResponse } from 'next/server'

/** Block debug API routes in production deployments. */
export function debugApiGuard(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return null
}
