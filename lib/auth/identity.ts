import type { AuthProvider, Prisma } from '@prisma/client'

export type AuthProviderName = AuthProvider

export type WalletIdentity = {
  authProvider: AuthProviderName
  authProviderId: string
}

/**
 * Prisma user fields for auth identity writes.
 * - Always sets authProvider + authProviderId
 * - Sets privyId only when provider is Privy (keeps Privy support without naming debt for WaaP)
 */
export type AuthIdentityDbFields = {
  authProvider?: AuthProviderName
  authProviderId?: string
  privyId?: string
}

export function buildAuthIdentityUpdate(
  identity: Partial<WalletIdentity>
): AuthIdentityDbFields {
  if (!identity.authProvider || !identity.authProviderId) return {}

  return {
    authProvider: identity.authProvider,
    authProviderId: identity.authProviderId,
    ...(identity.authProvider === 'privy'
      ? { privyId: identity.authProviderId }
      : {}),
  }
}

export function buildAuthIdentityCreate(
  identity: Partial<WalletIdentity>
): AuthIdentityDbFields {
  return buildAuthIdentityUpdate(identity)
}

/** Parse query/body identity; accepts legacy `privyId` param. */
export function parseAuthIdentity(input: {
  authProvider?: string | null
  authProviderId?: string | null
  privyId?: string | null
}): {
  authProvider?: AuthProviderName
  authProviderId?: string
  legacyPrivyId?: string
} {
  const provider = input.authProvider
  const providerId = input.authProviderId?.trim()
  const legacyPrivyId = input.privyId?.trim()

  if (
    provider &&
    (provider === 'waap' || provider === 'privy' || provider === 'external') &&
    providerId
  ) {
    return {
      authProvider: provider,
      authProviderId: providerId,
    }
  }

  if (legacyPrivyId) {
    return { legacyPrivyId }
  }

  return {}
}

/** OR conditions for user lookup by wallet vendor id (new + legacy). */
export function authIdentityLookupConditions(identity: {
  authProvider?: AuthProviderName
  authProviderId?: string
  legacyPrivyId?: string
}): Prisma.UserWhereInput[] {
  const conditions: Prisma.UserWhereInput[] = []

  if (identity.authProvider && identity.authProviderId) {
    conditions.push({
      authProvider: identity.authProvider,
      authProviderId: identity.authProviderId,
    })
  }

  if (identity.authProviderId) {
    conditions.push({ authProviderId: identity.authProviderId })
  }

  if (identity.legacyPrivyId) {
    conditions.push({ privyId: identity.legacyPrivyId })
    conditions.push({ authProviderId: identity.legacyPrivyId })
  }

  return conditions
}

export function parseAuthIdentityFromSearchParams(
  searchParams: URLSearchParams
): ReturnType<typeof parseAuthIdentity> {
  return parseAuthIdentity({
    authProvider: searchParams.get('authProvider'),
    authProviderId: searchParams.get('authProviderId'),
    privyId: searchParams.get('privyId'),
  })
}

/** Normalize onboarding/API body: prefer explicit auth fields, fall back to legacy privyId as WaaP. */
export function normalizeAuthIdentityBody(input: {
  authProvider?: AuthProviderName | string | null
  authProviderId?: string | null
  privyId?: string | null
}): WalletIdentity | null {
  const parsed = parseAuthIdentity(input)
  if (parsed.authProvider && parsed.authProviderId) {
    return {
      authProvider: parsed.authProvider,
      authProviderId: parsed.authProviderId,
    }
  }

  if (parsed.legacyPrivyId) {
    return {
      authProvider: 'waap',
      authProviderId: parsed.legacyPrivyId,
    }
  }

  return null
}

/** Resolve identity fields for user create/update from body + existing row. */
export function resolveAuthIdentityFields(input: {
  authProvider?: AuthProviderName | string | null
  authProviderId?: string | null
  privyId?: string | null
  fallback?: {
    authProvider?: AuthProviderName | null
    authProviderId?: string | null
    privyId?: string | null
  }
}): AuthIdentityDbFields {
  const fromBody = normalizeAuthIdentityBody(input)
  if (fromBody) return buildAuthIdentityCreate(fromBody)

  if (input.fallback?.authProvider && input.fallback.authProviderId) {
    return buildAuthIdentityCreate({
      authProvider: input.fallback.authProvider,
      authProviderId: input.fallback.authProviderId,
    })
  }

  if (input.fallback?.privyId) {
    const legacy = normalizeAuthIdentityBody({ privyId: input.fallback.privyId })
    if (legacy) return buildAuthIdentityCreate(legacy)
  }

  return {}
}
