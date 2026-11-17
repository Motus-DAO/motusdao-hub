import { NextRequest, NextResponse } from 'next/server'
import {
  getAIClient,
  getAIModel,
  getAIProvider,
  getVeniceChatOptions,
  hasAIKey,
  resolvePsychatChatModel,
} from '@/lib/ai-client'
import { isUsableChatOutput, sanitizeModelOutput, SHORT_INPUT_FALLBACK } from '@/lib/ai-output'
import {
  formatExploracionMarkdown,
  getPsychatSystemPrompt,
  resolvePsychatStructuredMode,
} from '@/lib/psychat-prompt'
import {
  checkPsychatGuestLimit,
  clientKeyFromRequest,
  consumePsychatGuestMessage,
  PSYCHAT_GUEST_CONSENT_VERSION,
} from '@/lib/psychat-guest-limit'
import { parseStructuredOutput, validateStructuredPayload } from '@/lib/psychat-structured-output'
import type OpenAI from 'openai'

export const maxDuration = 45

const GUEST_MAX_TOKENS = 220

export async function POST(req: NextRequest) {
  if (!hasAIKey()) {
    return NextResponse.json(
      { error: 'Psychat no está disponible en este momento.' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => null)
  if (!body || body.guestConsentVersion !== PSYCHAT_GUEST_CONSENT_VERSION) {
    return NextResponse.json(
      { error: 'Se requiere consentimiento de invitado para probar Psychat.' },
      { status: 400 },
    )
  }

  const key = clientKeyFromRequest(req)
  const limit = checkPsychatGuestLimit(key)
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          'Alcanzaste el límite de prueba de hoy. Inicia sesión para seguir con Psychat o vuelve mañana.',
        code: 'guest_limit',
        remaining: 0,
        resetAt: new Date(limit.resetAt).toISOString(),
      },
      { status: 429 },
    )
  }

  const rawMessages = body?.messages
  if (!Array.isArray(rawMessages)) {
    return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
  }

  const userMessages = (
    rawMessages as { role: 'user' | 'assistant' | 'system'; content: string }[]
  ).filter((m) => m.role === 'user' || m.role === 'assistant')

  const lastUser = userMessages.slice().reverse().find((m) => m.role === 'user')
  const userText = lastUser?.content || ''
  if (!userText.trim()) {
    return NextResponse.json({ error: 'Escribe un mensaje para continuar.' }, { status: 400 })
  }

  const hubRole = 'usuario' as const
  const structuredMode = resolvePsychatStructuredMode(hubRole, userText, {
    requestStructuredReport: false,
  })

  const input: Array<{ role: 'system' | 'assistant' | 'user'; content: string }> = [
    {
      role: 'system',
      content: `${getPsychatSystemPrompt(hubRole)}\n\n[MODO INVITADO] Sin cuenta. Respuestas breves. No es terapia ni diagnóstico. Invita a iniciar sesión o a ver profesionales en /psicoterapia cuando tenga sentido.`,
    },
    ...userMessages.map((m) => ({ role: m.role, content: m.content })),
  ]

  try {
    const client = getAIClient()
    const model = resolvePsychatChatModel(hubRole, structuredMode)
    const response = await client.chat.completions.create({
      model: getAIProvider() === 'venice' ? model : getAIModel(),
      messages: input,
      ...getVeniceChatOptions(),
      temperature: 0.65,
      max_tokens: GUEST_MAX_TOKENS,
    } as OpenAI.ChatCompletionCreateParamsNonStreaming)

    const raw = response.choices[0]?.message?.content ?? ''
    const cleaned = sanitizeModelOutput(raw)
    const text = isUsableChatOutput(cleaned) ? cleaned : SHORT_INPUT_FALLBACK

    consumePsychatGuestMessage(key)
    const after = checkPsychatGuestLimit(key)

    if (structuredMode === 'exploracion') {
      try {
        const parsed = parseStructuredOutput(text)
        const fields = validateStructuredPayload('exploracion', parsed)
        if (fields && 'eco' in fields) {
          return NextResponse.json({
            mode: 'exploracion',
            ...fields,
            text: formatExploracionMarkdown(fields),
            handoffSuggested: true,
            guest: true,
            remaining: Math.max(0, after.remaining - 1),
          })
        }
      } catch {
        /* fall through to plain text */
      }
    }

    return NextResponse.json({
      mode: 'qa',
      text,
      handoffSuggested: true,
      guest: true,
      remaining: Math.max(0, after.remaining - 1),
    })
  } catch (error) {
    console.error('[chat/guest]', error)
    return NextResponse.json({ error: 'No pudimos responder. Intenta de nuevo.' }, { status: 502 })
  }
}