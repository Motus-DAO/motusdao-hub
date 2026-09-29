import { mottyConfig } from '@/lib/motty/config'
import {
  formatKnowledgeForVisitor,
  searchPublicKnowledge,
} from '@/lib/motty/mcp'
import { createChatCompletion, hasMottyInference, type ProviderMessage } from '@/lib/motty/provider'
import { mottySystemPrompt } from '@/lib/motty/system-prompt'
import { enabledToolSchemas, executeMottyTool } from '@/lib/motty/tools'
import type { MottySession } from '@/lib/motty/types'

const FALLBACK_ES =
  'Puedo orientarte en la Academia con Acompañamiento Personalizado Digital, pero ahora no pude completar la respuesta. Revisa /academia o escribe de nuevo en un momento.'
const FALLBACK_EN =
  'I can guide you on Academy accompaniment, but I could not finish this reply. Check /academia or try again in a moment.'

export async function runHubMottyTurn(input: {
  session: MottySession
  userMessage: string
}): Promise<{ session: MottySession; reply: string }> {
  const { session, userMessage } = input
  const { maxToolRounds } = mottyConfig()

  if (!hasMottyInference()) {
    const reply = await groundedFallback(userMessage, session.locale)
    return { session, reply }
  }

  const messages: ProviderMessage[] = [
    { role: 'system', content: mottySystemPrompt(session.locale) },
    ...session.messages.map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    })),
    { role: 'user', content: userMessage },
  ]

  const tools = enabledToolSchemas()
  let working = session

  for (let round = 0; round < maxToolRounds; round += 1) {
    const completion = await createChatCompletion({ messages, tools })
    const { message } = completion
    const calls = message.tool_calls ?? []

    if (!calls.length) {
      const reply = (message.content ?? '').trim() || fallbackCopy(session.locale)
      return { session: working, reply }
    }

    messages.push({
      role: 'assistant',
      content: message.content,
      tool_calls: calls,
    })

    for (const call of calls) {
      let parsed: unknown = {}
      try {
        parsed = call.function.arguments ? JSON.parse(call.function.arguments) : {}
      } catch {
        parsed = {}
      }

      const executed = await executeMottyTool(call.function.name, parsed, working)
      working = executed.session

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(executed.result),
      })
    }
  }

  const last = await createChatCompletion({
    messages: [
      ...messages,
      {
        role: 'system',
        content:
          'Stop calling tools. Answer the professional now from the tool results you already have.',
      },
    ],
  })

  const reply = (last.message.content ?? '').trim() || fallbackCopy(session.locale)
  return { session: working, reply }
}

async function groundedFallback(
  userMessage: string,
  locale: MottySession['locale']
): Promise<string> {
  try {
    const hits = await searchPublicKnowledge({ query: userMessage })
    const context = formatKnowledgeForVisitor(hits)
    if (!hits.length || !context) return fallbackCopy(locale)

    if (locale === 'en') {
      return `I am Motty, your Academy accompaniment guide in MotusDAO Hub.\n\n${context}\n\nNext: open /academia or /academia/02-fundamentos.`
    }
    return `Soy Motty, tu guía de Acompañamiento Personalizado Digital en el Hub.\n\n${context}\n\nSiguiente paso: revisa /academia o /academia/02-fundamentos.`
  } catch {
    return fallbackCopy(locale)
  }
}

function fallbackCopy(locale: MottySession['locale']): string {
  return locale === 'en' ? FALLBACK_EN : FALLBACK_ES
}
