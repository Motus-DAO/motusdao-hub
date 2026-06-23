import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { NONCE_TTL_MS } from './constants'

export function generateNonceValue(): string {
  return randomBytes(16).toString('hex')
}

export async function createAuthNonce(address: string): Promise<string> {
  const normalizedAddress = address.toLowerCase()
  const nonce = generateNonceValue()
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS)

  await prisma.$transaction([
    prisma.authNonce.deleteMany({
      where: {
        OR: [
          { address: normalizedAddress },
          { expiresAt: { lt: new Date() } },
        ],
      },
    }),
    prisma.authNonce.create({
      data: {
        address: normalizedAddress,
        nonce,
        expiresAt,
      },
    }),
  ])

  return nonce
}

export async function consumeAuthNonce(
  address: string,
  nonce: string
): Promise<boolean> {
  const normalizedAddress = address.toLowerCase()
  const record = await prisma.authNonce.findFirst({
    where: {
      address: normalizedAddress,
      nonce,
      expiresAt: { gt: new Date() },
    },
  })

  if (!record) return false

  await prisma.authNonce.delete({ where: { id: record.id } })
  return true
}
