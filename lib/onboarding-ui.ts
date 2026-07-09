/** Shared onboarding navigation styles — theme-safe in light/dark/matrix */
export const onboardingBackButtonClass =
  'px-6 py-3 text-muted-foreground transition-colors hover:text-foreground'

export function getConnectBlockers(input: {
  authenticated: boolean
  eoaAddress?: string
  hasEmail: boolean
  termsAccepted: boolean
  siweSessionReady: boolean
}): string[] {
  const blockers: string[] = []

  if (!input.authenticated) blockers.push('Inicia sesión con tu email')
  if (!input.eoaAddress) blockers.push('Conecta tu wallet')
  if (!input.hasEmail) blockers.push('Agrega un correo electrónico válido')
  if (!input.termsAccepted) blockers.push('Acepta los términos y la política de privacidad')
  if (!input.siweSessionReady) blockers.push('Firma el mensaje de verificación de wallet (SIWE)')

  return blockers
}
