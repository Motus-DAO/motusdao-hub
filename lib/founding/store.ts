import { createHash } from 'crypto'
import { getAddress, isAddress } from 'viem'
import type { FoundingWaitlistRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { foundingCapForRole } from './constants'
import { foundingTierForPosition } from './tier'
import { newFoundingEntryId } from './id'
import { foundingWaitlistPostRateLimited, foundingWaitlistClientKey } from './rate-limit'

export type FoundingSignupInput = {
  role: FoundingWaitlistRole
  displayName: string
  email: string
  wallet?: string
  mnsLabel: string
  mnsTxHash: string
  locale?: 'es' | 'en'
  optionalNote?: string
  clientIp: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function publicDisplayName(displayName: string, mnsLabel: string): string {
  const trimmed = displayName.trim()
  if (trimmed.length > 0) return trimmed
  return `${mnsLabel}.motus`
}

export async function countFoundingEntries(role: FoundingWaitlistRole): Promise<number> {
  return prisma.foundingWaitlistEntry.count({ where: { role } })
}

export async function registerFoundingWaitlist(
  input: FoundingSignupInput
): Promise<
  | { ok: true; entry: Awaited<ReturnType<typeof prisma.foundingWaitlistEntry.create>> }
  | { ok: false; status: number; error: string; code?: string }
> {
  const cap = foundingCapForRole(input.role)
  const count = await countFoundingEntries(input.role)
  if (count >= cap) {
    return { ok: false, status: 403, error: 'Lista cerrada.', code: 'CLOSED' }
  }

  const email = normalizeEmail(input.email)
  const existing = await prisma.foundingWaitlistEntry.findUnique({
    where: { role_email: { role: input.role, email } },
  })
  if (existing) {
    return {
      ok: false,
      status: 409,
      error: 'Este email ya está en la lista para ese rol.',
      code: 'DUPLICATE_EMAIL',
    }
  }

  let wallet: string | undefined
  if (input.wallet?.trim()) {
    if (!isAddress(input.wallet)) {
      return { ok: false, status: 400, error: 'Wallet inválida.' }
    }
    wallet = getAddress(input.wallet)
  }

  const mnsLabel = input.mnsLabel.trim().toLowerCase()
  const mnsTxHash = input.mnsTxHash.trim()
  if (!mnsLabel || !/^[a-z0-9-]{2,32}$/i.test(mnsLabel)) {
    return { ok: false, status: 400, error: 'Nombre MNS inválido.' }
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(mnsTxHash)) {
    return { ok: false, status: 400, error: 'Hash de transacción MNS inválido.' }
  }

  const displayName = publicDisplayName(input.displayName, mnsLabel)
  const locale = input.locale === 'en' ? 'en' : 'es'

  const entry = await prisma.$transaction(async (tx) => {
    const latest = await tx.foundingWaitlistEntry.findFirst({
      where: { role: input.role },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const position = (latest?.position ?? 0) + 1
    if (position > cap) {
      throw new Error('CLOSED')
    }
    const { tier, discountPercent } = foundingTierForPosition(position)
    return tx.foundingWaitlistEntry.create({
      data: {
        id: newFoundingEntryId(input.role),
        role: input.role,
        position,
        tier,
        discountPercent,
        displayName,
        email,
        wallet,
        mnsLabel,
        mnsTxHash,
        clientIp: input.clientIp,
        locale,
        optionalNote: input.optionalNote?.trim() || null,
      },
    })
  })

  return { ok: true, entry }
}

export function foundingSignupRateLimited(request: Request): boolean {
  return foundingWaitlistPostRateLimited(foundingWaitlistClientKey(request))
}

export async function listFoundingPublic(
  role: FoundingWaitlistRole,
  page: number,
  pageSize: number
) {
  const cap = foundingCapForRole(role)
  const skip = (page - 1) * pageSize
  const [total, rows] = await Promise.all([
    prisma.foundingWaitlistEntry.count({ where: { role } }),
    prisma.foundingWaitlistEntry.findMany({
      where: { role },
      orderBy: { position: 'asc' },
      skip,
      take: pageSize,
      select: {
        position: true,
        displayName: true,
        tier: true,
        discountPercent: true,
        mnsLabel: true,
        mnsTxHash: true,
        status: true,
        createdAt: true,
      },
    }),
  ])

  return {
    cap,
    total,
    page,
    pageSize,
    entries: rows.map((row) => ({
      position: row.position,
      displayName: row.displayName,
      publicName: `${row.mnsLabel}.motus`,
      mnsTxHash: row.mnsTxHash,
      tier: row.tier,
      discountPercent: row.discountPercent,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  }
}

export async function listFoundingAdmin(role: FoundingWaitlistRole) {
  const cap = foundingCapForRole(role)
  const rows = await prisma.foundingWaitlistEntry.findMany({
    where: { role },
    orderBy: { position: 'asc' },
  })
  const byTier = { A: 0, B: 0, C: 0 }
  let codeSent = 0
  let redeemed = 0
  for (const row of rows) {
    byTier[row.tier] += 1
    if (row.status === 'code_sent') codeSent += 1
    if (row.status === 'redeemed') redeemed += 1
  }
  return {
    cap,
    kpis: {
      signups: rows.length,
      capRemaining: Math.max(0, cap - rows.length),
      byTier,
      codeSent,
      redeemed,
    },
    entries: rows,
  }
}

export async function hardDeleteFoundingEntry(
  id: string,
  adminWallet: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const entry = await prisma.foundingWaitlistEntry.findUnique({ where: { id } })
  if (!entry) {
    return { ok: false, status: 404, error: 'Registro no encontrado.' }
  }

  const emailHash = createHash('sha256').update(entry.email).digest('hex')

  await prisma.$transaction([
    prisma.foundingWaitlistAudit.create({
      data: {
        entryId: entry.id,
        emailHash,
        role: entry.role,
        adminWallet,
        position: entry.position,
      },
    }),
    prisma.foundingWaitlistEntry.delete({ where: { id } }),
  ])

  return { ok: true }
}

export function hashEmailForAudit(email: string): string {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex')
}