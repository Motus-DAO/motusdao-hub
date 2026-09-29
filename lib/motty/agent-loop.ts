import { mottyConfig } from '@/lib/motty/config'
import {
  formatLearningContextForPrompt,
  loadUserLearningContext,
  type UserLearningContext,
} from '@/lib/motty/learning-context'
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
  /** Optional preloaded context (tests). Production loads by session.userId. */
  learningContext?: UserLearningContext
}): Promise<{ session: MottySession; reply: string; learningContext: UserLearningContext | null }> {
  const { session, userMessage } = input
  const { maxToolRounds } = mottyConfig()

  let learningContext: UserLearningContext | null = input.learningContext ?? null
  if (!learningContext) {
    try {
      learningContext = await loadUserLearningContext(session.userId)
    } catch {
      learningContext = null
    }
  } else if (learningContext.userId !== session.userId) {
    // Never allow injecting another user's context into this turn.
    learningContext = null
  }

  if (!hasMottyInference()) {
    const reply = await groundedFallback(userMessage, session.locale, learningContext)
    return { session, reply, learningContext }
  }

  const messages: ProviderMessage[] = [
    { role: 'system', content: mottySystemPrompt(session.locale) },
  ]

  if (learningContext) {
    messages.push({
      role: 'system',
      content: formatLearningContextForPrompt(learningContext),
    })
  }

  messages.push(
    ...session.messages.map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    })),
    { role: 'user', content: userMessage }
  )

  const tools = enabledToolSchemas()
  let working = session

  for (let round = 0; round < maxToolRounds; round += 1) {
    const completion = await createChatCompletion({ messages, tools })
    const { message } = completion
    const calls = message.tool_calls ?? []

    if (!calls.length) {
      const reply = (message.content ?? '').trim() || fallbackCopy(session.locale)
      return { session: working, reply, learningContext }
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
  return { session: working, reply, learningContext }
}

async function groundedFallback(
  userMessage: string,
  locale: MottySession['locale'],
  learningContext: UserLearningContext | null
): Promise<string> {
  try {
    const hits = await searchPublicKnowledge({ query: userMessage })
    const context = formatKnowledgeForVisitor(hits)
    const stage = learningContext?.currentRouteStage
    const nextPath = stage ? `/academia/${stage}` : '/academia/02-fundamentos'

    if (!hits.length || !context) {
      if (locale === 'en') {
        return `I am Motty. ${stage ? `Your current route stage looks like ${stage}.` : ''} Open ${nextPath} or /academia.`
      }
      return `Soy Motty. ${stage ? `Tu etapa actual parece ${stage}.` : ''} Abre ${nextPath} o /academia.`
    }

    if (locale === 'en') {
      return `I am Motty, your Academy accompaniment guide in MotusDAO Hub.\n\n${context}\n\nNext: open ${nextPath}.`
    }
    return `Soy Motty, tu guía de Acompañamiento Personalizado Digital en el Hub.\n\n${context}\n\nSiguiente paso: revisa ${nextPath}.`
  } catch {
    return fallbackCopy(locale)
  }
}

function fallbackCopy(locale: MottySession['locale']): string {
  return locale === 'en' ? FALLBACK_EN : FALLBACK_ES
}
