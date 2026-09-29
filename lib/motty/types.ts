export type MottyLocale = 'es' | 'en'

export type MottyRole = 'user' | 'assistant' | 'system'

export type MottyMessage = {
  role: MottyRole
  content: string
}

export type MottySession = {
  id: string
  /** Bound server-side to Hub auth user. Never from client body. */
  userId: string
  locale: MottyLocale
  messages: MottyMessage[]
  createdAt: string
  updatedAt: string
}

export type ToolResult = {
  ok: boolean
  tool: string
  error?: string
  data?: unknown
}
