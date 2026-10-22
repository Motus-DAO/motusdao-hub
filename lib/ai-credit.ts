/** Daily inference budget for one Hub account. Prices are USD per 1M tokens. */
export const DAILY_AI_CREDIT_USD = 0.1

/** The allowance resets at midnight in this zone (UTC−6, no daylight saving). */
export const AI_CREDIT_TIME_ZONE = 'America/Mexico_City'

const MIN_OUTPUT_TOKENS = 64

const USD_PER_MILLION: Record<string, { input: number; output: number }> = {
  'e2ee-deepseek-v4-flash': { input: 0.182, output: 0.373 },
  'deepseek-v4-flash': { input: 0.138, output: 0.275 },
  'e2ee-glm-5-3-flash': { input: 0.16, output: 0.54 },
}

const DEFAULT_RATES = USD_PER_MILLION['e2ee-deepseek-v4-flash']

export function ratesForModel(model: string) {
  return USD_PER_MILLION[model] ?? DEFAULT_RATES
}

/** Conservative token estimate. Over-counting stops the call before the balance is gone. */
export function estimateTokens(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return 1
  return Math.ceil(trimmed.length / 3)
}

export function inferenceCostUsd(model: string, promptTokens: number, completionTokens: number) {
  const rates = ratesForModel(model)
  const cost =
    (Math.max(0, promptTokens) * rates.input + Math.max(0, completionTokens) * rates.output) /
    1_000_000
  return Math.round(cost * 1e8) / 1e8
}

export function creditDayStart(now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: AI_CREDIT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return new Date(`${day}T06:00:00.000Z`)
}

export function outputTokenCap(
  remainingUsd: number,
  inputTokens: number,
  model: string,
  requestedMaxTokens: number
) {
  const rates = ratesForModel(model)
  const inputCost = (Math.max(0, inputTokens) * rates.input) / 1_000_000
  const left = remainingUsd - inputCost
  if (left <= 0 || rates.output <= 0) return 0
  const affordable = Math.floor((left * 1_000_000) / rates.output)
  return Math.max(0, Math.min(requestedMaxTokens, affordable))
}

export function hasRoomForReply(maxTokens: number) {
  return maxTokens >= MIN_OUTPUT_TOKENS
}

export const AI_CREDIT_PACKS_USD = [5, 10] as const

export function isAiCreditPack(amount: number): amount is (typeof AI_CREDIT_PACKS_USD)[number] {
  return (AI_CREDIT_PACKS_USD as readonly number[]).includes(amount)
}

export function roundCreditUsd(value: number) {
  return Math.round(value * 1e8) / 1e8
}

/** Daily free credit is spent first. A purchase is a balance that stays until it is used. */
export function splitCreditCharge(input: {
  spentTodayUsd: number
  purchasedUsd: number
  chargeUsd: number
}) {
  const freeRoom = Math.max(0, roundCreditUsd(DAILY_AI_CREDIT_USD - input.spentTodayUsd))
  const purchasedRoom = Math.max(0, input.purchasedUsd)
  if (input.chargeUsd > roundCreditUsd(freeRoom + purchasedRoom) + 1e-8) return null
  const freeCoverUsd = Math.min(input.chargeUsd, freeRoom)
  const purchasedHoldUsd = roundCreditUsd(input.chargeUsd - freeCoverUsd)
  return { freeCoverUsd, purchasedHoldUsd }
}

/** Filled portion of the usage ring. 2 means almost nothing has been used. */
export function creditUsedPercent(input: { remainingUsd: number; allowanceUsd: number }) {
  if (input.allowanceUsd <= 0) return 100
  const used = Math.max(0, input.allowanceUsd - Math.max(0, input.remainingUsd))
  const ratio = used / input.allowanceUsd
  return Math.max(0, Math.min(100, Math.round(ratio * 100)))
}

export function formatCreditNote(input: { remainingUsd: number; purchasedUsd?: number }) {
  const remaining = Math.max(0, input.remainingUsd)
  const purchased = Math.max(0, input.purchasedUsd ?? 0)
  if (purchased > 0) {
    return `Disponible: ${remaining.toFixed(4)} USD. De eso, ${purchased.toFixed(2)} USD son comprados. El resto es el gratis de hoy.`
  }
  return `Crédito de hoy: ${remaining.toFixed(4)} de ${DAILY_AI_CREDIT_USD.toFixed(2)} USD.`
}

export class AiCreditExhaustedError extends Error {
  remainingUsd: number

  constructor(remainingUsd: number) {
    super('Se acabó el crédito. El gratis de hoy es 0.10 USD. Puedes comprar 5 o 10 USD.')
    this.name = 'AiCreditExhaustedError'
    this.remainingUsd = Math.max(0, remainingUsd)
  }
}
