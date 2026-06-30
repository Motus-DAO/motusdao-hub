const TEMPLATE_TOKEN_RE = /<\|[^|>]*\|>/g
const ROLE_LINE_RE = /(?:^|\n)\s*(?:assistant|user|system)\s*(?=\n|$)/gi
const REPEATED_ASSISTANT_RE = /(?:assistant\s*){2,}/gi

export function sanitizeModelOutput(text: string): string {
  return text
    .replace(TEMPLATE_TOKEN_RE, '')
    .replace(ROLE_LINE_RE, '\n')
    .replace(REPEATED_ASSISTANT_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function isUsableChatOutput(text: string): boolean {
  const cleaned = sanitizeModelOutput(text)
  if (!cleaned || cleaned.length < 8) return false
  if (/^(?:assistant\s*)+$/i.test(cleaned)) return false

  const letters = (cleaned.match(/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/g) || []).length
  if (letters / cleaned.length < 0.35) return false

  const assistantHits = cleaned.match(/assistant/gi)?.length ?? 0
  if (assistantHits >= 2 && cleaned.length < 120) return false

  return true
}

export const SHORT_INPUT_FALLBACK =
  'No entendí bien tu mensaje. ¿Podrías contarme un poco más en qué puedo ayudarte hoy sobre MotusDAO o salud mental?'
