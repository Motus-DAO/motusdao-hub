import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require registration
const publicRoutes = ['/registro', '/onboarding', '/', '/docs', '/contact', '/terms', '/privacy']
const apiRoutes = ['/api']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow API routes
  if (apiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // For all other routes, we'll check registration status client-side
  // The actual redirect will be handled by client-side components
  // This middleware just allows the request through
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
















