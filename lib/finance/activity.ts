/**
 * Unified finance activity (read model).
 *
 * Phase 2 of specs/finance-hub.md: one feed for the surfaces that today live in
 * different tables. It is read-only; the persisted ledger (`payment_intents`)
 * comes later and will feed the same shape.
 */
import type { OnchainHistoryItem } from '../onchain/history'

export type ActivityKind =
  | 'onchain_sent'
  | 'onchain_received'
  | 'therapy_card'
  | 'therapy_spei'
  | 'academy'

export type ActivityStatus = 'confirmed' | 'pending' | 'failed' | 'refunded'

export type ActivityItem = {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  amount: string | null
  currency: string | null
  timestamp: number
  status: ActivityStatus
  href: string | null
  explorerUrl: string | null
}

export type TherapyCardActivity = {
  sessionId: string
  paidAt: Date | null
  refundedAt: Date | null
  /** Therapy holds are stored in USD cents. */
  amountCents: number | null
  psmLabel?: string | null
}

export type TherapySpeiActivity = {
  sessionId: string
  amount: string | number | null
  currency: string | null
  createdAt: Date
}

export type AcademyActivity = {
  paymentId: string
  amount: string | number
  currency: string
  status: string
  createdAt: Date
  orderId: string | null
}

function shortAddress(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function formatAmount(value: string): string {
  if (!value.includes('.')) return value
  const [whole, fraction] = value.split('.')
  const trimmed = fraction.slice(0, 6).replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole
}

function amountFromCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

function academyStatus(status: string): ActivityStatus {
  if (status === 'confirmed') return 'confirmed'
  if (status === 'pending') return 'pending'
  if (status === 'refunded') return 'refunded'
  return 'failed'
}

/**
 * Merges the four sources into one chronological feed.
 *
 * A session paid by card wins over its SPEI events: the same session must not
 * appear twice when a patient reported a transfer and later paid by card.
 */
export function mergeActivity(input: {
  onchain?: OnchainHistoryItem[]
  card?: TherapyCardActivity[]
  spei?: TherapySpeiActivity[]
  academy?: AcademyActivity[]
  limit?: number
}): ActivityItem[] {
  const items: ActivityItem[] = []
  const cardSessions = new Set<string>()

  for (const item of input.onchain ?? []) {
    const sent = item.direction === 'sent'
    items.push({
      id: `onchain:${item.txHash}:${item.tokenAddress ?? 'native'}`,
      kind: sent ? 'onchain_sent' : 'onchain_received',
      title: sent
        ? `Enviaste ${formatAmount(item.amount)} ${item.symbol}`
        : `Recibiste ${formatAmount(item.amount)} ${item.symbol}`,
      subtitle: sent ? `A ${shortAddress(item.to)}` : `De ${shortAddress(item.from)}`,
      amount: formatAmount(item.amount),
      currency: item.symbol,
      timestamp: item.timestamp,
      status: item.status === 'failed' ? 'failed' : 'confirmed',
      href: '/pagos/historial',
      explorerUrl: item.explorerUrl,
    })
  }

  for (const card of input.card ?? []) {
    if (!card.paidAt) continue
    cardSessions.add(card.sessionId)
    items.push({
      id: `card:${card.sessionId}`,
      kind: 'therapy_card',
      title: card.refundedAt ? 'Sesión reembolsada (tarjeta)' : 'Sesión pagada con tarjeta',
      subtitle: card.psmLabel ? `Con ${card.psmLabel}` : 'Terapia',
      amount: card.amountCents != null ? amountFromCents(card.amountCents) : null,
      currency: card.amountCents != null ? 'USD' : null,
      timestamp: card.paidAt.getTime(),
      status: card.refundedAt ? 'refunded' : 'confirmed',
      href: '/psicoterapia',
      explorerUrl: null,
    })
  }

  for (const spei of input.spei ?? []) {
    if (cardSessions.has(spei.sessionId)) continue
    items.push({
      id: `spei:${spei.sessionId}:${spei.createdAt.getTime()}`,
      kind: 'therapy_spei',
      title: 'Sesión pagada por SPEI',
      subtitle: 'Transferencia bancaria',
      amount: spei.amount != null ? formatAmount(String(spei.amount)) : null,
      currency: spei.currency,
      timestamp: spei.createdAt.getTime(),
      status: 'confirmed',
      href: '/psicoterapia',
      explorerUrl: null,
    })
  }

  for (const payment of input.academy ?? []) {
    items.push({
      id: `academy:${payment.paymentId}`,
      kind: 'academy',
      title: 'Compra en Academia',
      subtitle: 'Curso o membresía',
      amount: formatAmount(String(payment.amount)),
      currency: payment.currency,
      timestamp: payment.createdAt.getTime(),
      status: academyStatus(payment.status),
      href: '/academia',
      explorerUrl: null,
    })
  }

  return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, input.limit ?? 50)
}
