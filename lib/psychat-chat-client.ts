import { authFetch } from '@/lib/auth/client'

/** Client timeout for conversational turns (TEE `/api/chat`). */
export const PSYCHAT_CHAT_TIMEOUT_MS = 55_000

/** Reporte estructurado PSM (Qwen) puede acercarse al límite del server. */
export const PSYCHAT_STRUCTURED_REPORT_TIMEOUT_MS = 90_000

export type PostPsychatHubChatOptions = {
  requestStructuredReport?: boolean
}

/** RAG citations returned by `POST /api/chat` (non-PSM turns only). */
export type PsychatRagSource = {
  sourcePath: string
  title: string
  namespace: string
  similarity: number
}

export type PsychatChatApiPayload = {
  error?: string
  code?: string
  mode?: string
  text?: string
  message?: string
  apertura?: string
  reflexion?: string
  cierre?: string
  recomendacion?: string
  disponibilidad?: string
  eco?: string
  pregunta?: string
  abierto?: string
  limite?: string
  puenteHumano?: string
  handoffSuggested?: boolean
  ragSources?: PsychatRagSource[]
  structuredFallback?: boolean
}

export function formatPsychatChatHttpError(
  status: number,
  data: PsychatChatApiPayload
): string {
  const base = data.error?.trim() || 'Error al procesar la solicitud'
  const parts = [base]
  if (data.code) parts.push(`Código: ${data.code}`)
  parts.push(`HTTP ${status}`)
  if (status === 504) {
    parts.push('El servidor cortó la petición por tiempo. Reintenta con un mensaje más corto.')
  } else if (status === 502 && data.code === 'structured_output_failed') {
    parts.push('La IA respondió en un formato que no pudimos leer. Reintenta en unos segundos.')
  }
  return parts.join(' · ')
}

export async function postPsychatHubChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: PostPsychatHubChatOptions = {}
): Promise<PsychatChatApiPayload> {
  const timeoutMs = options.requestStructuredReport
    ? PSYCHAT_STRUCTURED_REPORT_TIMEOUT_MS
    : PSYCHAT_CHAT_TIMEOUT_MS
  const res = await authFetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      requestStructuredReport: options.requestStructuredReport === true,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  const data = (await res.json().catch(() => ({}))) as PsychatChatApiPayload
  if (!res.ok) {
    if (data.code === 'ai_credit_exhausted') {
      throw Object.assign(new Error(data.error || 'Se acabó el crédito de IA de hoy.'), {
        psychatCode: 'ai_credit_exhausted' as const,
      })
    }
    throw new Error(formatPsychatChatHttpError(res.status, data))
  }
  return data
}

export function formatPsychatChatNetworkError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return `Psychat tardó más de ${Math.round(PSYCHAT_CHAT_TIMEOUT_MS / 1000)} s. Reintenta; si sigue, acorta el mensaje o espera un momento.`
  }
  if (err instanceof Error) {
    if (/aborted|abort/i.test(err.message)) {
      return `Psychat tardó más de ${Math.round(PSYCHAT_CHAT_TIMEOUT_MS / 1000)} s. Reintenta en un momento.`
    }
    return err.message
  }
  return 'No hubo conexión con Psychat. Revisa tu red o recarga la página.'
}
