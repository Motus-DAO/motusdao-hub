import { NextRequest, NextResponse } from 'next/server'
import { verifyRootRouterBridgeToken } from '@/lib/auth/rootrouter-bridge-token'
import { hasStoredAiProcessingConsent } from '@/lib/auth/ai-consent'
import {
  getAIClient,
  getAIModel,
  getAIProvider,
  getVeniceChatOptions,
  hasAIKey,
} from '@/lib/ai-client'
import { isUsableChatOutput, sanitizeModelOutput, SHORT_INPUT_FALLBACK } from '@/lib/ai-output'
import { AiCreditExhaustedError, estimateTokens, formatCreditNote } from '@/lib/ai-credit'
import { getCreditSnapshot, releaseAiCredit, reserveAiCredit, settleAiCredit } from '@/lib/ai-credit-store'
import { PSYCHAT_SYSTEM_PROMPT } from '@/lib/psychat-prompt'
import type OpenAI from 'openai'

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim()
}

async function createReliableChatCompletion(
  client: OpenAI,
  messages: Array<{ role: 'system' | 'assistant' | 'user'; content: string }>,
  options: { temperature: number; max_tokens: number }
) {
  const base = {
    model: getAIModel(),
    messages,
    ...getVeniceChatOptions(),
    ...options,
  }
  const response = await client.chat.completions.create({ ...base, temperature: options.temperature })
  const raw = response.choices[0]?.message?.content ?? ''
  const promptTokens = response.usage?.prompt_tokens ?? estimateTokens(messages.map((m) => m.content).join('\n'))
  const completionTokens = response.usage?.completion_tokens ?? estimateTokens(raw)
  const cleaned = sanitizeModelOutput(raw)
  const text = isUsableChatOutput(cleaned) ? cleaned : SHORT_INPUT_FALLBACK
  return { text, promptTokens, completionTokens }
}

/** OpenAI-compatible upstream for local RootRouter. No RAG; Hub does not persist context store. */
export async function POST(req: NextRequest) {
  const token = bearerToken(req)
  const userId = token ? verifyRootRouterBridgeToken(token) : null
  if (!userId) {
    return NextResponse.json({ error: 'Token de puente inválido o expirado.' }, { status: 401 })
  }

  if (!(await hasStoredAiProcessingConsent(userId))) {
    return NextResponse.json({ error: 'Consentimiento de IA no activo.' }, { status: 403 })
  }

  if (!hasAIKey()) {
    return NextResponse.json(
      { error: `Missing ${getAIProvider() === 'venice' ? 'VENICE_INFERENCE_KEY' : 'OPENAI_API_KEY'}` },
      { status: 503 }
    )
  }

  let hold: { chargeId: string; maxTokens: number } | null = null
  try {
    const body = await req.json()
    const rawMessages = body?.messages
    if (!Array.isArray(rawMessages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const userMessages = (rawMessages as { role: string; content: string }[]).filter(
      (m) => m.role === 'user' || m.role === 'assistant'
    )

    const input: Array<{ role: 'system' | 'assistant' | 'user'; content: string }> = [
      { role: 'system', content: PSYCHAT_SYSTEM_PROMPT },
    ]
    userMessages.forEach((msg) => {
      input.push({ role: msg.role as 'user' | 'assistant', content: msg.content })
    })

    const inputText = input.map((m) => m.content).join('\n')
    const model = getAIModel()
    hold = await reserveAiCredit({
      userId,
      model,
      inputText,
      requestedMaxTokens: 800,
    })

    const client = getAIClient()
    const result = await createReliableChatCompletion(client, input, {
      temperature: 0.7,
      max_tokens: hold.maxTokens,
    })

    await settleAiCredit(hold.chargeId, {
      model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    })
    hold = null

    const credit = await getCreditSnapshot(userId)

    return NextResponse.json({
      id: `chatcmpl-rootrouter-${Date.now()}`,
      object: 'chat.completion',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: result.text },
          finish_reason: 'stop',
        },
      ],
      mode: 'qa',
      text: result.text,
      credit,
      creditNote: formatCreditNote(credit),
    })
  } catch (error) {
    if (hold) await releaseAiCredit(hold.chargeId)
    if (error instanceof AiCreditExhaustedError) {
      return NextResponse.json(
        { error: error.message, code: 'ai_credit_exhausted', remainingUsd: error.remainingUsd },
        { status: 402 }
      )
    }
    console.error('[rootrouter-upstream]', error)
    return NextResponse.json({ error: 'Error en inferencia upstream' }, { status: 500 })
  }
}
