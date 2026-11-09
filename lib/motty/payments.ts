/**
 * Server-side payment helpers for Motty's agent tools.
 *
 * Amounts, addresses and the payee are resolved here from the database. The
 * model only chooses which session to pay; it never supplies an address or an
 * amount.
 */
import { randomUUID } from 'crypto'
import { SessionStatus } from '@prisma/client'
import { formatUnits, parseUnits, type Address, type Hex } from 'viem'
import { prisma } from '@/lib/prisma'
import { PLATFORM_SESSION_PRICE_USD } from '@/lib/constants'
import { sessionPriceWmxn } from '@/lib/pricing'
import {
  buildRipioPublicRampUrl,
  ripioCountryFromEnv,
  ripioTokenForCountry,
} from '@/lib/ripio/public-ramp'
import {
  createTherapyEscrow,
  escrowPublicClient,
  readEscrow,
  therapyEscrowId,
} from '@/lib/escrow/create'
import { ERC20_APPROVE_ABI, WMXN_ADDRESS } from '@/lib/escrow/abi'
import { motusNameService } from '@/lib/motus-name-service'
import { buildOfficeJitsiUrl } from '@/lib/jitsi'
import {
  getAvailableSlotsForPsm,
  isSlotAvailable,
  slotDurationMinutes,
} from '@/lib/psm/availability'

const STATUS_LABEL: Record<number, string> = {
  0: 'Sin crear',
  1: 'Esperando depósito',
  2: 'Depositada',
  3: 'Confirmada por el profesional',
  4: 'En disputa',
  5: 'Liquidada',
  6: 'Reembolsada',
}

export { mxnPerUsd } from '@/lib/pricing'

export function quoteTherapy() {
  const price = sessionPriceWmxn()
  return {
    usd: price.usd,
    mxn: price.mxn,
    rate: price.rate,
    source: price.test ? ('test' as const) : ('fixed' as const),
    note: price.test
      ? 'Precio de prueba local; no usar en producción.'
      : 'Tipo de cambio estimado; Ripio aplica el suyo al comprar.',
  }
}

export async function getUpcomingSessionForUser(userId: string) {
  const session = await prisma.session.findFirst({
    where: {
      userId,
      status: { in: [SessionStatus.requested, SessionStatus.accepted] },
      scheduledStart: { gte: new Date() },
    },
    orderBy: { scheduledStart: 'asc' },
    select: {
      id: true,
      status: true,
      scheduledStart: true,
      psm: {
        select: {
          eoaAddress: true,
          motusName: true,
          email: true,
          psm: { select: { sessionPrice: true, currency: true } },
        },
      },
    },
  })

  if (!session) return { ok: true as const, session: null }

  return {
    ok: true as const,
    session: {
      sessionId: session.id,
      status: session.status,
      startsAt: session.scheduledStart?.toISOString() ?? null,
      psmName: session.psm?.motusName || session.psm?.email || 'tu profesional',
      listedPrice: session.psm?.psm?.sessionPrice ?? PLATFORM_SESSION_PRICE_USD,
      listedCurrency: session.psm?.psm?.currency ?? 'MXN',
      quote: quoteTherapy(),
    },
  }
}

export async function getWalletSnapshotForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { eoaAddress: true },
  })
  if (!user) return { ok: false as const, error: 'user_not_found' }

  const address = user.eoaAddress as Address
  const client = escrowPublicClient()
  const usdtAddress = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as Address
  const [wmxn, usdt, celo] = await Promise.all([
    client.readContract({
      address: WMXN_ADDRESS,
      abi: ERC20_APPROVE_ABI,
      functionName: 'balanceOf',
      args: [address],
    }),
    client.readContract({
      address: usdtAddress,
      abi: ERC20_APPROVE_ABI,
      functionName: 'balanceOf',
      args: [address],
    }),
    client.getBalance({ address }),
  ])

  return {
    ok: true as const,
    address,
    wmxn: formatUnits(wmxn as bigint, 18),
    usdt: formatUnits(usdt as bigint, 6),
    celo: formatUnits(celo, 18),
  }
}

export type TransferToken = 'wMXN' | 'USDT' | 'CELO'

export function normalizeTransferToken(value: unknown): TransferToken | null {
  const token = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (token === 'WMXN' || token === 'MXN') return 'wMXN'
  if (token === 'USDT') return 'USDT'
  if (token === 'CELO') return 'CELO'
  return null
}

export function isValidTransferAmount(value: string): boolean {
  const amount = Number(value.replace(',', '.'))
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const THERAPIST_RE =
  /(mi|my)\s+(psic[oó]log[oa]|terapeuta|profesional|therapist)|esta persona|this person/i

/**
 * Resolves a human recipient to an address and returns a /pagos link. It never
 * signs or moves funds: the user reviews and signs on the page.
 */
export async function prepareTransferForUser(
  userId: string,
  input: { recipient: string; amount: string; token: string }
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { eoaAddress: true, motusName: true },
  })
  if (!user?.eoaAddress) return { ok: false as const, error: 'wallet_not_found' }

  const token = normalizeTransferToken(input.token)
  if (!token) {
    return {
      ok: false as const,
      error: 'token_required',
      message: 'Pregunta al usuario si quiere wMXN, USDT o CELO.',
    }
  }
  if (!isValidTransferAmount(input.amount)) {
    return { ok: false as const, error: 'amount_invalid' }
  }

  const recipient = input.recipient.trim()
  let toAddress: Address
  let toName: string
  let recipientType: 'motus' | 'therapist' | 'address'

  if (ADDRESS_RE.test(recipient)) {
    toAddress = recipient as Address
    toName = recipient
    recipientType = 'address'
  } else if (THERAPIST_RE.test(recipient)) {
    const session = await prisma.session.findFirst({
      where: { userId },
      orderBy: { scheduledStart: 'desc' },
      select: {
        psm: {
          select: {
            eoaAddress: true,
            motusName: true,
            email: true,
            profile: { select: { nombre: true, apellido: true } },
          },
        },
      },
    })
    if (!session?.psm?.eoaAddress) {
      return { ok: false as const, error: 'no_therapist' }
    }
    toAddress = session.psm.eoaAddress as Address
    toName =
      session.psm.motusName ||
      `${session.psm.profile?.nombre ?? ''} ${session.psm.profile?.apellido ?? ''}`.trim() ||
      session.psm.email ||
      'tu profesional'
    recipientType = 'therapist'
  } else {
    const resolved = await motusNameService.resolve(recipient)
    if (resolved) {
      toAddress = resolved
      toName = /\.motus$/i.test(recipient) ? recipient : `${recipient}.motus`
      recipientType = 'motus'
    } else {
      // Not a .motus: try a Hub user by handle, email or display name. We do
      // not send yet: the agent must confirm the human match first.
      const terms = recipient.split(/\s+/).filter(Boolean).slice(0, 3)
      const profileFilters = terms.flatMap((term) => [
        { profile: { is: { nombre: { contains: term, mode: 'insensitive' as const } } } },
        { profile: { is: { apellido: { contains: term, mode: 'insensitive' as const } } } },
      ])
      const hubUsers = await prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { motusName: { equals: recipient, mode: 'insensitive' } },
            { email: { equals: recipient, mode: 'insensitive' } },
            ...profileFilters,
          ],
        },
        take: 5,
        select: {
          eoaAddress: true,
          motusName: true,
          email: true,
          profile: { select: { nombre: true, apellido: true } },
        },
      })

      const candidates = hubUsers
        .filter((candidate) => candidate.eoaAddress)
        .filter(
          (candidate) =>
            candidate.eoaAddress!.toLowerCase() !== user.eoaAddress!.toLowerCase()
        )
        .map((candidate) => ({
          name:
            `${candidate.profile?.nombre ?? ''} ${candidate.profile?.apellido ?? ''}`.trim() ||
            candidate.motusName ||
            candidate.email ||
            'Usuario',
          motusName: candidate.motusName,
          address: candidate.eoaAddress,
          email: candidate.email,
        }))

      if (candidates.length === 0) {
        return { ok: false as const, error: 'name_not_found' }
      }

      const amount = input.amount.replace(',', '.')
      return {
        ok: true as const,
        requiresConfirmation: true,
        fromName: user.motusName ?? null,
        amount,
        token,
        candidates,
        note:
          'No hay link todavía. Muestra nombre, .motus y dirección; pregunta si es la persona correcta. Si confirma, vuelve a llamar con el motusName o la dirección exactos.',
      }
    }
  }

  if (toAddress.toLowerCase() === user.eoaAddress.toLowerCase()) {
    return { ok: false as const, error: 'self_transfer' }
  }

  const amount = input.amount.replace(',', '.')
  const link = `/pagos/enviar?to=${encodeURIComponent(toAddress)}&toName=${encodeURIComponent(
    toName
  )}&amount=${encodeURIComponent(amount)}&token=${token}`

  return {
    ok: true as const,
    fromName: user.motusName ?? null,
    toName,
    toAddress,
    amount,
    token,
    recipientType,
    link,
    note: 'El usuario revisa y firma en /pagos/enviar. No muevas fondos ni digas que ya enviaste.',
  }
}

export async function getRampLinkForUser(userId: string, amountWmxn?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { eoaAddress: true },
  })
  if (!user) return { ok: false as const, error: 'user_not_found' }

  const country = ripioCountryFromEnv()
  const token = ripioTokenForCountry(country)
  const url = buildRipioPublicRampUrl({
    flow: 'onramp',
    country,
    address: user.eoaAddress,
    ...(amountWmxn ? { amount: amountWmxn } : {}),
  })

  return { ok: true as const, url, country, token }
}

export async function getPaymentStatusForSession(userId: string, sessionId: string) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  })
  if (!session) return { ok: false as const, error: 'session_not_found' }

  const escrowId = therapyEscrowId(sessionId)
  const escrow = await readEscrow(escrowId)
  if (!escrow) {
    return { ok: true as const, escrowId, status: 0, statusLabel: STATUS_LABEL[0], escrow: null }
  }

  return {
    ok: true as const,
    escrowId,
    status: escrow.status,
    statusLabel: STATUS_LABEL[escrow.status] ?? `Estado ${escrow.status}`,
    amountWmxn: formatUnits(escrow.amount, 18),
    startsAt: escrow.startsAt,
    settledAt: escrow.settledAt,
    challengeWindow: escrow.challengeWindow,
  }
}

export async function getMyTherapistAvailabilityForUser(userId: string) {
  const match = await prisma.match.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
    select: {
      psmId: true,
      psm: {
        select: {
          motusName: true,
          email: true,
          profile: { select: { nombre: true, apellido: true } },
        },
      },
    },
  })
  if (!match) return { ok: false as const, error: 'no_therapist' }

  const psmName =
    `${match.psm?.profile?.nombre ?? ''} ${match.psm?.profile?.apellido ?? ''}`.trim() ||
    match.psm?.motusName ||
    match.psm?.email ||
    'tu profesional'

  const slots = await getAvailableSlotsForPsm(match.psmId, 14)
  return {
    ok: true as const,
    psmName,
    slots: slots.slice(0, 8).map((slot) => ({
      slotId: slot.id,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      durationMinutes: slotDurationMinutes(slot),
      timezone: slot.timezone,
    })),
    note: 'Pregunta al usuario cuál horario quiere; no reserves hasta que elija un slotId.',
  }
}

export async function bookTherapySessionForUser(userId: string, slotId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      userMatches: {
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          psmId: true,
          psm: {
            select: {
              motusName: true,
              email: true,
              profile: { select: { nombre: true, apellido: true } },
            },
          },
        },
      },
    },
  })
  if (!user || user.role !== 'usuario') {
    return { ok: false as const, error: 'user_not_eligible' }
  }
  const match = user.userMatches[0]
  if (!match) return { ok: false as const, error: 'no_therapist' }

  const slot = await prisma.providerAvailabilitySlot.findFirst({
    where: {
      id: slotId,
      psmId: match.psmId,
      isAvailable: true,
      startsAt: { gt: new Date() },
    },
  })
  if (!slot) return { ok: false as const, error: 'slot_not_found' }
  if (!(await isSlotAvailable(slot.id, match.psmId))) {
    return { ok: false as const, error: 'slot_taken' }
  }

  const durationMinutes = slotDurationMinutes(slot)
  const scheduledEnd = new Date(
    slot.startsAt.getTime() + durationMinutes * 60 * 1000
  )
  const session = await prisma.session.create({
    data: {
      id: randomUUID(),
      userId,
      psmId: match.psmId,
      matchId: match.id,
      status: 'requested',
      mode: 'video_external',
      externalUrl: buildOfficeJitsiUrl(match.id),
      scheduledStart: slot.startsAt,
      scheduledEnd,
      timezone: slot.timezone,
      durationMinutes,
    },
  })

  const escrow = await createEscrowForUserSession(userId, session.id)
  if (!escrow.ok) {
    return {
      ok: false as const,
      error: 'escrow_failed',
      sessionId: session.id,
      detail: escrow.error,
    }
  }

  const psmName =
    `${match.psm?.profile?.nombre ?? ''} ${match.psm?.profile?.apellido ?? ''}`.trim() ||
    match.psm?.motusName ||
    match.psm?.email ||
    'tu profesional'

  return {
    ok: true as const,
    sessionId: session.id,
    psmName,
    startsAt: slot.startsAt.toISOString(),
    durationMinutes,
    amountWmxn: escrow.amountWmxn,
    escrowId: escrow.escrowId,
    payPath: escrow.payPath,
    note: 'La cita y el escrow están creados. Comparte el link; el usuario firma el depósito.',
  }
}

export async function createEscrowForUserSession(userId: string, sessionId: string) {
  const [user, session] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { eoaAddress: true } }),
    prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
        status: { in: [SessionStatus.requested, SessionStatus.accepted] },
      },
      select: { id: true, scheduledStart: true, psm: { select: { eoaAddress: true } } },
    }),
  ])

  if (!user) return { ok: false as const, error: 'user_not_found' }
  if (!session) return { ok: false as const, error: 'session_not_payable' }
  if (!session.psm?.eoaAddress) return { ok: false as const, error: 'psm_wallet_missing' }

  const now = Math.floor(Date.now() / 1000)
  const startsAt = session.scheduledStart
    ? Math.floor(session.scheduledStart.getTime() / 1000)
    : now + 300

  if (startsAt < now) return { ok: false as const, error: 'session_already_started' }

  const quote = quoteTherapy()
  // Therapy pays the professional at the end of the session, not 48h later.
  // The 48h rule is the cancellation policy before the session.
  const challengeWindow = Number(process.env.ESCROW_CHALLENGE_WINDOW_SECONDS || '0')

  const created = await createTherapyEscrow({
    sessionId: session.id,
    patient: user.eoaAddress as Address,
    payee: session.psm.eoaAddress as Address,
    amount: parseUnits(quote.mxn.toFixed(2), 18),
    startsAt,
    challengeWindow,
  })

  return {
    ok: true as const,
    created: created.created,
    txHash: created.txHash ?? null,
    escrowId: created.id as Hex,
    amountWmxn: quote.mxn.toFixed(2),
    startsAt,
    challengeWindow,
    payPath: `/pagar/${created.id}`,
    payUrl: `https://app.motusdao.org/pagar/${created.id}`,
  }
}
