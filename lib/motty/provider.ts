import {
  getAIClient,
  getAIModel,
  getVeniceChatOptions,
  hasAIKey,
} from '@/lib/ai-client'

export type ProviderMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_call_id?: string
  tool_calls?: ProviderToolCall[]
}

export type ProviderToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type ProviderTool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export type ChatCompletion = {
  message: {
    role: 'assistant'
    content: string | null
    tool_calls?: ProviderToolCall[]
  }
}

export function hasMottyInference(): boolean {
  return hasAIKey()
}

export async function createChatCompletion(input: {
  messages: ProviderMessage[]
  tools?: ProviderTool[]
}): Promise<ChatCompletion> {
  if (!hasAIKey()) {
    throw new Error('Motty inference is not configured.')
  }

  const client = getAIClient()
  const response = await client.chat.completions.create({
    model: getAIModel(),
    temperature: 0.3,
    messages: input.messages as Parameters<typeof client.chat.completions.create>[0]['messages'],
    ...getVeniceChatOptions(),
    ...(input.tools?.length
      ? { tools: input.tools as never, tool_choice: 'auto' as const }
      : {}),
  })

  const message = response.choices[0]?.message
  if (!message) {
    throw new Error('Motty inference returned no message.')
  }

  return {
    message: {
      role: 'assistant',
      content: message.content ?? null,
      tool_calls: message.tool_calls as ProviderToolCall[] | undefined,
    },
  }
}
