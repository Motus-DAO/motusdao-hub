import OpenAI from 'openai'

type AIProvider = 'openai' | 'venice'

const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase() as AIProvider

export function getAIProvider() {
  return provider === 'venice' ? 'venice' : 'openai'
}

export function getAIModel() {
  if (getAIProvider() === 'venice') {
    return process.env.VENICE_MODEL || process.env.OPENAI_MODEL || 'llama-3.3-70b'
  }

  return process.env.OPENAI_MODEL || 'gpt-4o'
}

export function hasAIKey() {
  if (getAIProvider() === 'venice') {
    return Boolean(process.env.VENICE_INFERENCE_KEY || process.env.VENICE_API_KEY)
  }

  return Boolean(process.env.OPENAI_API_KEY)
}

export function getAIClient() {
  if (getAIProvider() === 'venice') {
    return new OpenAI({
      apiKey: process.env.VENICE_INFERENCE_KEY || process.env.VENICE_API_KEY,
      baseURL: process.env.VENICE_API_BASE_URL || 'https://api.venice.ai/api/v1'
    })
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export function getEmbeddingModel() {
  if (getAIProvider() === 'venice') {
    return process.env.VENICE_EMBEDDING_MODEL || process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
  }

  return process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
}

export function hasEmbeddingKey() {
  if (getAIProvider() === 'venice') {
    return Boolean(process.env.VENICE_INFERENCE_KEY || process.env.VENICE_API_KEY)
  }

  return Boolean(process.env.OPENAI_API_KEY)
}

export function getEmbeddingClient() {
  return getAIClient()
}

export function getVeniceChatOptions(): { stop?: string[] } {
  if (getAIProvider() !== 'venice') return {}

  return {
    stop: [
      '<|eot_id|>',
      '<|start_header_id|>',
      '<|end_header_id|>',
      'assistant<|',
    ],
  }
}

