import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth/session'
import { documentPathBelongsToOwner, normalizeWalletAddress } from '@/lib/storage'

export type UploadActor = {
  userId: string | null
  ownerKey: string
}

export async function resolveUploadActor(
  request: NextRequest,
  eoaAddress?: string | null,
  userId?: string | null
): Promise<UploadActor> {
  const session = await requireSession(request)

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, eoaAddress: true },
    })
    if (!user) throw new Error('User not found')
    if (session.userId !== user.id) {
      throw new Error('Not authorized to upload for this user')
    }
    return { userId: user.id, ownerKey: user.eoaAddress }
  }

  if (eoaAddress) {
    const ownerKey = normalizeWalletAddress(eoaAddress)
    if (session.eoaAddress.toLowerCase() !== ownerKey) {
      throw new Error('Wallet address does not match session')
    }
    const user = await prisma.user.findFirst({
      where: { eoaAddress: { equals: ownerKey, mode: 'insensitive' } },
      select: { id: true },
    })
    return { userId: user?.id ?? null, ownerKey }
  }

  if (session.eoaAddress) {
    return { userId: session.userId, ownerKey: normalizeWalletAddress(session.eoaAddress) }
  }

  throw new Error('Authenticated wallet address is required')
}

export function assertDocumentOwnership(
  storagePath: string,
  ownerKey: string
): void {
  if (!documentPathBelongsToOwner(storagePath, ownerKey)) {
    throw new Error('Document path does not belong to this user')
  }
}
