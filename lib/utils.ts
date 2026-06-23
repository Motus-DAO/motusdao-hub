import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { NextRequest } from 'next/server'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * @deprecated Use SIWE session auth via lib/auth/session.ts instead.
 * Client-sent privyId headers are not cryptographically verified.
 */
export async function getPrivyUser(request: NextRequest): Promise<{ id: string } | null> {
  // Try to get privyId from headers (set by client)
  const privyId = request.headers.get('x-privy-id') || 
                  request.headers.get('privy-id')
  
  if (privyId) {
    return { id: privyId }
  }

  // Try to get from query params (for development)
  const { searchParams } = new URL(request.url)
  const queryPrivyId = searchParams.get('privyId')
  
  if (queryPrivyId) {
    return { id: queryPrivyId }
  }

  return null
}
