import type { User } from '@prisma/client'
import { getAddress } from 'viem'
import { prisma } from '@/lib/prisma'
import { ALREADY_REGISTERED_CODE } from '@/lib/auth/hub-session'

export type OnboardingIdentityLookup = {
  id: string
  email: string
  eoaAddress: string
  registrationCompleted: boolean
}

export type OnboardingIdentityDecision =
  | { status: 'create'; normalizedEoa: string }
  | {
      status: 'update'
      normalizedEoa: string
      userId: string
      identitySync: {
        email?: string
        eoaAddress?: string
      }
    }
  | { status: 'conflict'; message: string; code: 'IDENTITY_CONFLICT' }
  | {
      status: 'already_registered'
      message: string
      code: typeof ALREADY_REGISTERED_CODE
    }

export type OnboardingIdentityResult =
  | { status: 'create'; normalizedEoa: string }
  | {
      status: 'update'
      user: User
      normalizedEoa: string
      identitySync: {
        email?: string
        eoaAddress?: string
      }
    }
  | { status: 'conflict'; message: string; code: 'IDENTITY_CONFLICT' }
  | {
      status: 'already_registered'
      message: string
      code: typeof ALREADY_REGISTERED_CODE
    }

function normalizeOnboardingEoa(eoaAddress: string): string {
  return getAddress(eoaAddress.trim()).toLowerCase()
}

function normalizeExistingEoa(eoaAddress: string | null | undefined): string | null {
  if (!eoaAddress) return null
  try {
    return normalizeOnboardingEoa(eoaAddress)
  } catch {
    return eoaAddress.toLowerCase()
  }
}

export function shouldMutateUserOnOnboarding(
  decision: OnboardingIdentityDecision | OnboardingIdentityResult
): boolean {
  return decision.status === 'create' || decision.status === 'update'
}

/**
 * Pure identity decision. Completed accounts never produce identitySync,
 * so callers cannot rebind email/wallet.
 */
export function decideOnboardingIdentity(input: {
  email: string
  normalizedEoa: string
  userByEmail: OnboardingIdentityLookup | null
  userByEoa: OnboardingIdentityLookup | null
}): OnboardingIdentityDecision {
  const { email, normalizedEoa, userByEmail, userByEoa } = input

  if (userByEmail && userByEoa && userByEmail.id !== userByEoa.id) {
    return {
      status: 'conflict',
      code: 'IDENTITY_CONFLICT',
      message:
        'Ya existe una cuenta con este correo y otra distinta con esta wallet. Contacta soporte para unificarlas.',
    }
  }

  const existing = userByEmail ?? userByEoa
  if (!existing) {
    return { status: 'create', normalizedEoa }
  }

  if (existing.registrationCompleted) {
    const existingEoa = normalizeExistingEoa(existing.eoaAddress)
    const walletMismatch = existingEoa !== normalizedEoa
    return {
      status: 'already_registered',
      code: ALREADY_REGISTERED_CODE,
      message: walletMismatch
        ? 'Ya tienes una cuenta registrada. Conéctate con la misma wallet que usaste al registrarte.'
        : 'Ya tienes una cuenta registrada. Ve a tu perfil.',
    }
  }

  const identitySync: { email?: string; eoaAddress?: string } = {}
  const existingEoa = normalizeExistingEoa(existing.eoaAddress)

  if (existing.email !== email) {
    identitySync.email = email
  }

  if (existingEoa !== normalizedEoa) {
    identitySync.eoaAddress = normalizedEoa
  }

  return {
    status: 'update',
    userId: existing.id,
    normalizedEoa,
    identitySync,
  }
}

/**
 * Resolves which User row onboarding should update, or whether to create one.
 * Wallet lookup is case-insensitive; stored EOAs are normalized to lowercase.
 */
export async function resolveOnboardingIdentity(input: {
  email: string
  eoaAddress: string
}): Promise<OnboardingIdentityResult> {
  const normalizedEoa = normalizeOnboardingEoa(input.eoaAddress)

  const [userByEmail, userByEoa] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.user.findFirst({
      where: {
        eoaAddress: { equals: normalizedEoa, mode: 'insensitive' },
      },
    }),
  ])

  const decision = decideOnboardingIdentity({
    email: input.email,
    normalizedEoa,
    userByEmail,
    userByEoa,
  })

  if (decision.status === 'create') {
    return decision
  }

  if (decision.status === 'conflict' || decision.status === 'already_registered') {
    return decision
  }

  const existing = userByEmail ?? userByEoa
  if (!existing) {
    return { status: 'create', normalizedEoa }
  }

  if (decision.identitySync.email) {
    const emailOwner = await prisma.user.findUnique({ where: { email: input.email } })
    if (emailOwner && emailOwner.id !== existing.id) {
      return {
        status: 'conflict',
        code: 'IDENTITY_CONFLICT',
        message:
          'Este correo ya está asociado a otra wallet. Usa el mismo correo y wallet con los que te registraste.',
      }
    }
  }

  if (decision.identitySync.eoaAddress) {
    const walletOwner = await prisma.user.findFirst({
      where: {
        eoaAddress: { equals: normalizedEoa, mode: 'insensitive' },
        NOT: { id: existing.id },
      },
    })
    if (walletOwner) {
      return {
        status: 'conflict',
        code: 'IDENTITY_CONFLICT',
        message:
          'Esta wallet ya está asociada a otro correo. Conéctate con la cuenta original o contacta soporte.',
      }
    }
  }

  return {
    status: 'update',
    user: existing,
    normalizedEoa,
    identitySync: decision.identitySync,
  }
}
