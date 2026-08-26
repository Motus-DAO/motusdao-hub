export const UNLINKED_WALLET_CODE = 'UNLINKED_WALLET'
export const ALREADY_REGISTERED_CODE = 'ALREADY_REGISTERED'

export type HubSessionSnapshot = {
  authenticated: boolean
  userId: string | null
  eoaAddress: string | null
}

export type ProfileSessionAccess =
  | { status: 'unauthenticated' }
  | { status: 'unlinked' }
  | { status: 'ok'; userId: string }

export type ProfileLoadErrorKind =
  | 'not_found'
  | 'unlinked'
  | 'unauthorized'
  | 'forbidden'
  | 'generic'

export function shouldBootstrapHubSession(input: {
  walletReady: boolean
  walletAuthenticated: boolean
  currentEoa: string | null
  session: HubSessionSnapshot | null
}): boolean {
  if (!input.walletReady || !input.walletAuthenticated || !input.currentEoa) {
    return false
  }

  const session = input.session
  if (!session?.authenticated || !session.eoaAddress) {
    return true
  }

  return session.eoaAddress.toLowerCase() !== input.currentEoa.toLowerCase()
}

export async function runHubSessionBootstrap(input: {
  walletReady: boolean
  walletAuthenticated: boolean
  currentEoa: string | null
  session: HubSessionSnapshot | null
  establish: () => Promise<boolean>
}): Promise<'ready' | 'bootstrapped' | 'skipped' | 'failed'> {
  if (
    !shouldBootstrapHubSession({
      walletReady: input.walletReady,
      walletAuthenticated: input.walletAuthenticated,
      currentEoa: input.currentEoa,
      session: input.session,
    })
  ) {
    if (input.session?.authenticated && input.session.userId) {
      return 'ready'
    }
    return 'skipped'
  }

  try {
    const ok = await input.establish()
    return ok ? 'bootstrapped' : 'failed'
  } catch {
    return 'failed'
  }
}

export function resolveProfileSessionAccess(
  session: HubSessionSnapshot | null
): ProfileSessionAccess {
  if (!session?.authenticated) {
    return { status: 'unauthenticated' }
  }

  if (!session.userId) {
    return { status: 'unlinked' }
  }

  return { status: 'ok', userId: session.userId }
}

export function classifyProfileLoadError(
  status: number,
  code?: string | null
): ProfileLoadErrorKind {
  if (status === 404) return 'not_found'
  if (status === 403) return 'forbidden'
  if (status === 401 && code === UNLINKED_WALLET_CODE) return 'unlinked'
  if (status === 401) return 'unauthorized'
  return 'generic'
}

export function shouldShowCompleteRegistration(
  kind: ProfileLoadErrorKind
): boolean {
  return kind === 'not_found'
}

export function profileLoadErrorMessage(kind: ProfileLoadErrorKind): string {
  switch (kind) {
    case 'not_found':
      return 'Perfil no encontrado. Por favor completa el registro primero.'
    case 'unlinked':
      return 'Tu wallet está conectada, pero no está vinculada a un perfil de MotusDAO. Usa la misma wallet con la que te registraste.'
    case 'unauthorized':
      return 'Necesitas verificar tu sesión para ver el perfil.'
    case 'forbidden':
      return 'No tienes permiso para ver este perfil.'
    default:
      return 'Error al cargar el perfil'
  }
}

export const PROFILE_WALLET_READY_TIMEOUT_MS = 12_000
export const SIWE_SESSION_LOADING_TIMEOUT_MS = 15_000

export type SiweSessionStateKind = 'loading' | 'ready' | 'needs_signature' | 'no_wallet'

export type ProfileAccessGateKind =
  | 'wallet_loading'
  | 'unauthenticated'
  | 'session_loading'
  | 'needs_signature'
  | 'profile_loading'
  | 'error'
  | 'ready'

export function resolveProfileAccessGate(input: {
  walletReady: boolean
  walletAuthenticated: boolean
  walletTimedOut?: boolean
  sessionState: SiweSessionStateKind
  signing: boolean
  profileLoading: boolean
  error: string | null
  hasProfileName: boolean
}): ProfileAccessGateKind {
  if (!input.walletReady) {
    return input.walletTimedOut ? 'unauthenticated' : 'wallet_loading'
  }

  if (!input.walletAuthenticated || input.sessionState === 'no_wallet') {
    return 'unauthenticated'
  }

  if (input.signing || input.sessionState === 'needs_signature') {
    return 'needs_signature'
  }

  if (input.sessionState === 'loading') {
    return 'session_loading'
  }

  if (input.profileLoading) {
    return 'profile_loading'
  }

  if (input.error && !input.hasProfileName) {
    return 'error'
  }

  return 'ready'
}

export function profileAccessGateCopy(kind: ProfileAccessGateKind): {
  title: string
  description: string
} {
  switch (kind) {
    case 'wallet_loading':
      return {
        title: 'Conectando wallet',
        description: 'Estamos restaurando tu sesión de wallet. Esto suele tardar unos segundos.',
      }
    case 'unauthenticated':
      return {
        title: 'Inicia sesión para ver tu perfil',
        description:
          'No hay una wallet conectada. Inicia sesión para cargar tu perfil. Si acabas de borrar cookies, vuelve a conectar tu cuenta.',
      }
    case 'session_loading':
      return {
        title: 'Verificando sesión',
        description: 'Comprobamos que tu wallet coincida con tu cuenta de MotusDAO.',
      }
    case 'needs_signature':
      return {
        title: 'Confirma tu sesión',
        description:
          'Tu wallet está conectada, pero falta firmar un mensaje de verificación (Sign-In with Ethereum). No cuesta gas ni mueve fondos.',
      }
    case 'profile_loading':
      return {
        title: 'Cargando perfil',
        description: 'Obteniendo tu información de MotusDAO.',
      }
    default:
      return {
        title: 'No se pudo cargar el perfil',
        description: 'Intenta de nuevo. Si el problema continúa, cierra sesión y vuelve a entrar.',
      }
  }
}
