import type { User } from '@prisma/client'
import { getAddress } from 'viem'
import { prisma } from '@/lib/prisma'

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

  const identitySync: { email?: string; eoaAddress?: string } = {}
  const existingEoa = normalizeExistingEoa(existing.eoaAddress)

  if (existing.email !== input.email) {
    const emailOwner = await prisma.user.findUnique({ where: { email: input.email } })
    if (emailOwner && emailOwner.id !== existing.id) {
      return {
        status: 'conflict',
        code: 'IDENTITY_CONFLICT',
        message:
          'Este correo ya está asociado a otra wallet. Usa el mismo correo y wallet con los que te registraste.',
      }
    }
    identitySync.email = input.email
  }

  if (existingEoa !== normalizedEoa) {
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
    identitySync.eoaAddress = normalizedEoa
  }

  return {
    status: 'update',
    user: existing,
    normalizedEoa,
    identitySync,
  }
}
