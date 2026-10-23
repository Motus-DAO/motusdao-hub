import { SessionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  parseMxnAmount,
  parseSpeiAccount,
  normalizeTransferReference,
  transferState,
  TRANSFER_CONFIRMED,
  TRANSFER_REJECTED,
  TRANSFER_REPORTED,
  type SpeiAccount,
} from '@/lib/spei'

const ACTIVE_SESSION = [SessionStatus.requested, SessionStatus.accepted]

type TransferEventRow = {
  kind: string
  amount: { toFixed: (digits: number) => string } | null
  currency: string
  reference: string | null
  note: string | null
  createdAt: Date
}

export type TransferView = {
  state: ReturnType<typeof transferState>
  amount: string | null
  currency: string
  reference: string | null
  reportedAt: string | null
  note: string | null
}

function personName(
  profile: { nombre: string; apellido: string } | null | undefined,
  fallback: string
): string {
  const name = [profile?.nombre, profile?.apellido].filter(Boolean).join(' ').trim()
  return name || fallback
}

export function summarizeTransfer(events: TransferEventRow[]): TransferView {
  const state = transferState(events.map((event) => event.kind))
  const report = [...events].reverse().find((event) => event.kind === TRANSFER_REPORTED)
  const rejection =
    state === 'rejected'
      ? [...events].reverse().find((event) => event.kind === TRANSFER_REJECTED)
      : null
  return {
    state,
    amount: report?.amount ? report.amount.toFixed(2) : null,
    currency: 'MXN',
    reference: report?.reference ?? null,
    reportedAt: report?.createdAt.toISOString() ?? null,
    note: rejection?.note ?? null,
  }
}

export function readSpeiAccount(
  psm: {
    speiBeneficiaryName: string | null
    speiBankName: string | null
    speiClabe: string | null
  } | null
): SpeiAccount | null {
  if (!psm) return null
  const parsed = parseSpeiAccount({
    beneficiaryName: psm.speiBeneficiaryName ?? '',
    bankName: psm.speiBankName ?? '',
    clabe: psm.speiClabe ?? '',
  })
  return parsed.ok ? parsed.account : null
}

export async function loadSpeiHome(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, psm: true },
  })
  if (!user) return null

  if (user.role === 'psm') {
    const sessions = user.psm
      ? await prisma.session.findMany({
          where: { psmId: userId, status: { in: ACTIVE_SESSION } },
          orderBy: [{ scheduledStart: 'asc' }, { createdAt: 'desc' }],
          include: {
            user: { include: { profile: true } },
            transferEvents: { orderBy: { createdAt: 'asc' } },
          },
        })
      : []

    return {
      role: 'psm' as const,
      profileMissing: !user.psm,
      account: readSpeiAccount(user.psm),
      sessions: sessions.map((session) => ({
        id: session.id,
        counterpartName: personName(session.user.profile, 'Paciente'),
        scheduledStart: session.scheduledStart?.toISOString() ?? null,
        listedPrice: user.psm?.sessionPrice ?? null,
        listedCurrency: user.psm?.currency || 'MXN',
        transfer: summarizeTransfer(session.transferEvents),
      })),
    }
  }

  const session = await prisma.session.findFirst({
    where: { userId, status: { in: ACTIVE_SESSION } },
    orderBy: { createdAt: 'desc' },
    include: {
      psm: { include: { profile: true, psm: true } },
      transferEvents: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!session) return { role: 'usuario' as const, session: null }

  return {
    role: 'usuario' as const,
    session: {
      id: session.id,
      counterpartName: personName(session.psm.profile, 'Tu profesional'),
      scheduledStart: session.scheduledStart?.toISOString() ?? null,
      listedPrice: session.psm.psm?.sessionPrice ?? null,
      listedCurrency: session.psm.psm?.currency || 'MXN',
      account: readSpeiAccount(session.psm.psm),
      transfer: summarizeTransfer(session.transferEvents),
    },
  }
}

export async function saveSpeiAccount(userId: string, body: unknown) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { psm: true },
  })
  if (!user || user.role !== 'psm' || !user.psm) {
    return { status: 403 as const, error: 'Solo un profesional con perfil puede registrar su CLABE.' }
  }
  const parsed = parseSpeiAccount(body)
  if (!parsed.ok) return { status: 400 as const, error: parsed.error }

  await prisma.pSMProfile.update({
    where: { userId },
    data: {
      speiBeneficiaryName: parsed.account.beneficiaryName,
      speiBankName: parsed.account.bankName,
      speiClabe: parsed.account.clabe,
    },
  })
  return { status: 200 as const, account: parsed.account }
}

export async function recordTransferAction(actorId: string, sessionId: string, body: unknown) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { transferEvents: { orderBy: { createdAt: 'asc' } } },
  })
  if (
    !session ||
    (session.status !== SessionStatus.requested && session.status !== SessionStatus.accepted)
  ) {
    return { status: 404 as const, error: 'No hay una cita activa para este pago.' }
  }

  const state = transferState(session.transferEvents.map((event) => event.kind))
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}

  if (record.action === 'report') {
    if (actorId !== session.userId) {
      return { status: 403 as const, error: 'Solo el paciente puede avisar la transferencia.' }
    }
    if (state === 'confirmed') {
      return { status: 409 as const, error: 'Este pago ya quedó confirmado.' }
    }
    if (state === 'reported') {
      return {
        status: 409 as const,
        error: 'Ya avisaste esta transferencia. Falta la confirmación de tu profesional.',
      }
    }
    const amount = parseMxnAmount(record.amount)
    const reference = normalizeTransferReference(record.reference)
    if (amount == null) {
      return { status: 400 as const, error: 'Escribe el monto en pesos, con hasta dos decimales.' }
    }
    if (!reference) {
      return { status: 400 as const, error: 'Pega la clave de rastreo. Son entre 4 y 40 letras o números.' }
    }
    const event = await prisma.sessionTransferEvent.create({
      data: {
        sessionId,
        actorUserId: actorId,
        kind: TRANSFER_REPORTED,
        amount: amount.toFixed(2),
        currency: 'MXN',
        reference,
      },
    })
    return { status: 201 as const, eventId: event.id, targetUserId: session.userId, kind: TRANSFER_REPORTED }
  }

  if (record.action === 'confirm' || record.action === 'reject') {
    if (actorId !== session.psmId) {
      return { status: 403 as const, error: 'Solo el profesional de esta cita puede confirmar el pago.' }
    }
    if (state !== 'reported') {
      return { status: 409 as const, error: 'Todavía no hay un aviso de transferencia por confirmar.' }
    }
    const note = typeof record.note === 'string' ? record.note.trim().slice(0, 200) : ''
    const kind = record.action === 'confirm' ? TRANSFER_CONFIRMED : TRANSFER_REJECTED
    const event = await prisma.sessionTransferEvent.create({
      data: {
        sessionId,
        actorUserId: actorId,
        kind,
        note: record.action === 'reject' ? note || 'No identificó la transferencia.' : null,
      },
    })
    return { status: 201 as const, eventId: event.id, targetUserId: session.userId, kind }
  }

  return { status: 400 as const, error: 'Acción no reconocida.' }
}
