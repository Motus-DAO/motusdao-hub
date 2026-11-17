export const ONBOARDING_ROUTE = '/registro'

/** Paths where unregistered users are not forced into the wizard */
export const ONBOARDING_EXEMPT_PATHS = [
  ONBOARDING_ROUTE,
  '/',
  '/psychat',
  '/academia',
  '/psicoterapia',
  '/founding',
  '/perfil',
  '/finanzas',
  '/pagos',
  '/videochat',
  '/bitacora',
  '/admin',
  '/docs',
  '/terms',
  '/privacy',
  '/contact',
  '/cookies',
  '/subprocesadores',
]

export function isOnboardingExemptPath(pathname: string): boolean {
  return ONBOARDING_EXEMPT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}
