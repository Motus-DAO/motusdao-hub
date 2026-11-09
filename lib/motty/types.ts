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


export type MottyAction =
  | {
      kind: 'transfer'
      toName: string
      toAddress: string
      amount: string
      token: 'wMXN' | 'USDT' | 'CELO'
      link?: string
    }
  | {
      kind: 'escrow'
      payPath: string
      escrowId?: string
      sessionId?: string
      amountWmxn: string
      startsAt?: string | null
      psmName?: string | null
    }
