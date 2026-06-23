import type { NextRequest } from 'next/server'
import { requireAdmin, handleAuthError } from './session'

/**
 * Call at the top of admin route handlers.
 * Returns a Response to return early, or null if authorized.
 */
export async function guardAdmin(request: NextRequest) {
  try {
    await requireAdmin(request)
    return null
  } catch (error) {
    return handleAuthError(error)
  }
}
