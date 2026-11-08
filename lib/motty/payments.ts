/**
 * Server-side payment helpers for Motty's agent tools.
 *
 * Amounts, addresses and the payee are resolved here from the database. The
 * model only chooses which session to pay; it never supplies an address or an
 * amount.
 */
import { SessionStatus } from '@prisma/client'
import { formatUnits, parseUnits, type Address, type Hex } from 'viem'
import { prisma } from '@/lib/prisma'
import { PLATFORM_SESSION_PRICE_USD } from '@/lib/constants'
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

const STATUS_LABEL: Record<number, string> = {
  0: 'Sin crear',
  1: 'Esperando depósito',
  2: 'Depositada',
  3: 'Confirmada por el profesional',
  4: 'En disputa',
  5: 'Liquidada',
  6: 'Reembolsada',
}

export function mxnPerUsd(): number {
  const raw = Number(process.env.MOTUS_MXN_PER_USD || '18.5')
  return Number.isFinite(raw) && raw > 0 ? raw : 18.5
}

export function quoteTherapy() {
  const rate = mxnPerUsd()
  const usd = PLATFORM_SESSION_PRICE_USD
  const mxn = Math.round(usd * rate * 100) / 100
  return {
    usd,
    mxn,
    rate,
    source: 'fixed' as const,
    note: 'Tipo de cambio estimado; Ripio aplica el suyo al comprar.',
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
  const [wmxn, celo] = await Promise.all([
    client.readContract({
      address: WMXN_ADDRESS,
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
    celo: formatUnits(celo, 18),
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
  const challengeWindow = Number(process.env.ESCROW_CHALLENGE_WINDOW_SECONDS || '172800')

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
    payUrl: `https://app.motusdao.org/pagar/${created.id}`,
  }
}
