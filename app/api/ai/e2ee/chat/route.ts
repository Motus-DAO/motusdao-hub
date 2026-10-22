import { NextRequest, NextResponse } from 'next/server'
import { getAIModel, getAIProvider, getVeniceApiKey, getVeniceBaseUrl, hasAIKey } from '@/lib/ai-client'
import { AiCreditExhaustedError } from '@/lib/ai-credit'
import { finishAiCreditReserve, releaseAiCredit, reserveAiCredit, settleAiCredit } from '@/lib/ai-credit-store'
import { requireAiProcessingConsent } from '@/lib/auth/ai-consent'
import { handleAuthError } from '@/lib/auth/session'
import { assertRelayMessages, normalizeUncompressedKey, type RelayMessage } from '@/lib/venice-e2ee'

const E2EE_MAX_TOKENS = 256

function safeVeniceError(body: string) {
  return body.replace(/[0-9a-fA-F]{20,}/g, '[hex]').slice(0, 220)
}

async function postEncryptedChat(input: {
  model: string
  messages: RelayMessage[]
  clientPublicKey: string
  modelPublicKey: string
  maxTokens: number
  lean: boolean
}) {
  return fetch(`${getVeniceBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getVeniceApiKey()}`,
      'Content-Type': 'application/json',
      'X-Venice-TEE-Client-Pub-Key': input.clientPublicKey,
      'X-Venice-TEE-Model-Pub-Key': input.modelPublicKey,
      'X-Venice-TEE-Signing-Algo': 'ecdsa',
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      stream: true,
      max_tokens: input.maxTokens,
      temperature: 0.7,
      ...(input.lean
        ? {}
        : {
            stream_options: { include_usage: true },
            venice_parameters: {
              disable_thinking: true,
              strip_thinking_response: true,
              include_venice_system_prompt: false,
            },
          }),
    }),
  })
}

async function readUsage(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let promptTokens = 0
  let completionTokens = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const chunk = JSON.parse(data) as { usage?: { prompt_tokens?: number; completion_tokens?: number } }
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens ?? promptTokens
          completionTokens = chunk.usage.completion_tokens ?? completionTokens
        }
      } catch {
        // Usage is optional. The encrypted chunks stay unread.
      }
    }
  }
  return { promptTokens, completionTokens }
}

export async function POST(request: NextRequest) {
  let userId: string
  try {
    const session = await requireAiProcessingConsent(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub para usar la IA.' }, { status: 403 })
    }
    userId = session.userId
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }

  if (getAIProvider() !== 'venice' || !hasAIKey()) {
    return NextResponse.json({ error: 'E2EE solo está disponible con Venice.' }, { status: 503 })
  }

  const model = getAIModel()
  if (!model.startsWith('e2ee-')) {
    return NextResponse.json({ error: 'El modelo configurado no acepta cifrado desde el navegador.' }, { status: 400 })
  }

  let hold: { chargeId: string; maxTokens: number } | null = null
  try {
    const body = await request.json()
    const messages = body?.messages as RelayMessage[]
    assertRelayMessages(messages)
    const clientPublicKey = normalizeUncompressedKey(String(body?.clientPublicKey || ''))
    const modelPublicKey = normalizeUncompressedKey(String(body?.modelPublicKey || ''))

    hold = await reserveAiCredit({
      userId,
      model,
      inputText: messages.map((message) => message.content).join('\n'),
      requestedMaxTokens: E2EE_MAX_TOKENS,
    })

    let upstream = await postEncryptedChat({
      model,
      messages,
      clientPublicKey,
      modelPublicKey,
      maxTokens: hold.maxTokens,
      lean: false,
    })
    if (!upstream.ok && upstream.status >= 500) {
      const firstError = safeVeniceError(await upstream.text().catch(() => ''))
      console.error('Venice E2EE retry', upstream.status, firstError)
      upstream = await postEncryptedChat({
        model,
        messages,
        clientPublicKey,
        modelPublicKey,
        maxTokens: hold.maxTokens,
        lean: true,
      })
    }

    if (!upstream.ok || !upstream.body) {
      const detail = safeVeniceError(await upstream.text().catch(() => ''))
      console.error('Venice E2EE rejected', upstream.status, detail)
      await releaseAiCredit(hold.chargeId)
      return NextResponse.json({ error: 'Venice no aceptó el mensaje cifrado.' }, { status: 502 })
    }

    const [clientStream, usageStream] = upstream.body.tee()
    const chargeId = hold.chargeId
    void readUsage(usageStream)
      .then(async (usage) => {
        if (usage.promptTokens || usage.completionTokens) {
          await settleAiCredit(chargeId, { model, ...usage })
          return
        }
        await finishAiCreditReserve(chargeId)
      })
      .catch(() => finishAiCreditReserve(chargeId))

    return new Response(clientStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    if (hold) await releaseAiCredit(hold.chargeId)
    if (error instanceof AiCreditExhaustedError) {
      return NextResponse.json(
        { error: error.message, code: 'ai_credit_exhausted', remainingUsd: error.remainingUsd },
        { status: 429 }
      )
    }
    const message = error instanceof Error ? error.message : 'No se pudo enviar el mensaje cifrado.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
