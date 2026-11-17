import { getAddress } from 'viem'
import type { AuthProvider, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuthError } from './errors'

export type LinkedWalletRow = {
  id: string
  address: string
  label: string | null
  isPrimary: boolean
  linkedAt: Date
  lastUsedAt: Date | null
}

export type UserForSession = {
  id: string
  role: Role
  isPlatformAdmin: boolean
  authProvider: AuthProvider | null
  authProviderId: string | null
  registrationCompleted: boolean
  eoaAddress: string
}

export function normalizeLinkedWalletAddress(address: string): string {
  return getAddress(address.trim()).toLowerCase()
}

/** Resolve Hub user for a SIWE signer address (linked wallet first, then legacy User.eoaAddress). */
export async function findUserForSignerAddress(
  address: string
): Promise<UserForSession | null> {
  const normalized = normalizeLinkedWalletAddress(address)

  const link = await prisma.linkedWallet.findFirst({
    where: {
      address: normalized,
      user: { deletedAt: null },
    },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          isPlatformAdmin: true,
          authProvider: true,
          authProviderId: true,
          registrationCompleted: true,
          eoaAddress: true,
        },
      },
    },
  })

  if (link) {
    await prisma.linkedWallet
      .update({
        where: { id: link.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => undefined)

    return link.user
  }

  return prisma.user.findFirst({
    where: {
      eoaAddress: { equals: normalized, mode: 'insensitive' },
      deletedAt: null,
    },
    select: {
      id: true,
      role: true,
      isPlatformAdmin: true,
      authProvider: true,
      authProviderId: true,
      registrationCompleted: true,
      eoaAddress: true,
    },
  })
}

export async function listLinkedWalletsForUser(
  userId: string
): Promise<LinkedWalletRow[]> {
  const rows = await prisma.linkedWallet.findMany({
    where: { userId },
    orderBy: [{ isPrimary: 'desc' }, { linkedAt: 'asc' }],
    select: {
      id: true,
      address: true,
      label: true,
      isPrimary: true,
      linkedAt: true,
      lastUsedAt: true,
    },
  })
  return rows
}

export async function ensureLegacyUserHasPrimaryLink(userId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { eoaAddress: true },
  })
  if (!user?.eoaAddress) return

  const normalized = normalizeLinkedWalletAddress(user.eoaAddress)
  const existing = await prisma.linkedWallet.findUnique({
    where: { address: normalized },
  })
  if (existing) {
    if (existing.userId === userId && !existing.isPrimary) {
      await prisma.$transaction([
        prisma.linkedWallet.updateMany({
          where: { userId, isPrimary: true },
          data: { isPrimary: false },
        }),
        prisma.linkedWallet.update({
          where: { id: existing.id },
          data: { isPrimary: true },
        }),
      ])
    }
    return
  }

  await prisma.$transaction([
    prisma.linkedWallet.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.linkedWallet.create({
      data: {
        userId,
        address: normalized,
        isPrimary: true,
      },
    }),
  ])
}

export async function linkWalletToUser(params: {
  userId: string
  address: string
  label?: string
}): Promise<LinkedWalletRow> {
  const normalized = normalizeLinkedWalletAddress(params.address)

  const taken = await prisma.linkedWallet.findUnique({
    where: { address: normalized },
    select: { userId: true },
  })
  if (taken && taken.userId !== params.userId) {
    throw new AuthError(409, 'Esta wallet ya está vinculada a otra cuenta')
  }
  if (taken && taken.userId === params.userId) {
    const row = await prisma.linkedWallet.findUniqueOrThrow({
      where: { address: normalized },
      select: {
        id: true,
        address: true,
        label: true,
        isPrimary: true,
        linkedAt: true,
        lastUsedAt: true,
      },
    })
    return row
  }

  const count = await prisma.linkedWallet.count({ where: { userId: params.userId } })
  const isPrimary = count === 0

  const created = await prisma.linkedWallet.create({
    data: {
      userId: params.userId,
      address: normalized,
      label: params.label ?? null,
      isPrimary,
    },
    select: {
      id: true,
      address: true,
      label: true,
      isPrimary: true,
      linkedAt: true,
      lastUsedAt: true,
    },
  })

  if (isPrimary) {
    await prisma.user.update({
      where: { id: params.userId },
      data: { eoaAddress: normalized },
    })
  }

  return created
}

export async function unlinkWalletFromUser(params: {
  userId: string
  address: string
}): Promise<void> {
  const normalized = normalizeLinkedWalletAddress(params.address)

  const row = await prisma.linkedWallet.findFirst({
    where: { userId: params.userId, address: normalized },
  })
  if (!row) {
    throw new AuthError(404, 'Wallet no encontrada en tu cuenta')
  }

  const count = await prisma.linkedWallet.count({ where: { userId: params.userId } })
  if (count <= 1) {
    throw new AuthError(400, 'No puedes quitar tu única wallet')
  }

  if (row.isPrimary) {
    throw new AuthError(
      400,
      'No puedes quitar la wallet primaria. Vincula otra y cámbiala primero.'
    )
  }

  await prisma.linkedWallet.delete({ where: { id: row.id } })
}

export async function setPrimaryLinkedWallet(params: {
  userId: string
  address: string
  registrationCompleted: boolean
  allowAdminOverride?: boolean
}): Promise<void> {
  if (params.registrationCompleted && !params.allowAdminOverride) {
    throw new AuthError(403, 'No se puede cambiar la wallet primaria tras completar el registro')
  }

  const normalized = normalizeLinkedWalletAddress(params.address)

  const row = await prisma.linkedWallet.findFirst({
    where: { userId: params.userId, address: normalized },
  })
  if (!row) {
    throw new AuthError(404, 'Wallet no vinculada a esta cuenta')
  }

  await prisma.$transaction([
    prisma.linkedWallet.updateMany({
      where: { userId: params.userId },
      data: { isPrimary: false },
    }),
    prisma.linkedWallet.update({
      where: { id: row.id },
      data: { isPrimary: true },
    }),
    prisma.user.update({
      where: { id: params.userId },
      data: { eoaAddress: normalized },
    }),
  ])
}

/** Session wallet may be any linked address for this userId. */
export async function sessionSignerBelongsToUser(
  userId: string,
  sessionEoa: string
): Promise<boolean> {
  const normalized = normalizeLinkedWalletAddress(sessionEoa)
  const link = await prisma.linkedWallet.findFirst({
    where: { userId, address: normalized },
    select: { id: true },
  })
  if (link) return true

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { eoaAddress: true },
  })
  if (!user?.eoaAddress) return false
  try {
    return normalizeLinkedWalletAddress(user.eoaAddress) === normalized
  } catch {
    return false
  }
}