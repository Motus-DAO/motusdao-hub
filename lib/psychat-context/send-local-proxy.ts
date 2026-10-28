import { checkRootRouterProxyHealth } from '@/lib/psychat-context/proxy-health'

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

export async function sendPsychatViaRootRouterProxy(
  proxyBaseUrl: string,
  model: string,
  messages: ChatMessage[]
): Promise<{ text: string; creditNote?: string }> {
  const base = proxyBaseUrl.replace(/\/$/, '')
  const healthy = await checkRootRouterProxyHealth(base)
  if (!healthy) {
    throw new Error(
      'No responde RootRouter en esa URL. Inicia el proxy local (puerto 8787) y vuelve a intentar.'
    )
  }

  const filtered = messages.filter((m) => m.role === 'user' || m.role === 'assistant')

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: filtered,
      temperature: 0.7,
    }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    code?: string
    text?: string
    choices?: Array<{ message?: { content?: string } }>
    creditNote?: string
  }

  if (!res.ok) {
    if (data.code === 'ai_credit_exhausted') {
      throw new Error(data.error || 'Se acabó el crédito de IA.')
    }
    throw new Error(data.error || 'El proxy RootRouter no pudo completar la solicitud.')
  }

  const text =
    data.text ||
    data.choices?.[0]?.message?.content ||
    'No se pudo generar una respuesta.'

  return { text, creditNote: data.creditNote }
}
