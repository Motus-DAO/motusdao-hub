export function supportMailPlumbingReady(): boolean {
  const enabled = process.env.SUPPORT_MAIL_ENABLED?.trim().toLowerCase()
  const on = enabled === '1' || enabled === 'true'
  const key = process.env.RESEND_API_KEY?.trim()
  return on && Boolean(key)
}

/** Human hint when plumbing is off (admin founding / support mail). */
export function supportMailNotReadyReason(): string {
  const enabled = process.env.SUPPORT_MAIL_ENABLED?.trim().toLowerCase()
  const on = enabled === '1' || enabled === 'true'
  const hasKey = Boolean(process.env.RESEND_API_KEY?.trim())
  const parts: string[] = []
  if (!on) {
    parts.push('SUPPORT_MAIL_ENABLED=true')
  }
  if (!hasKey) {
    parts.push('RESEND_API_KEY=re_…')
  }
  const envHint =
    process.env.VERCEL === '1'
      ? 'en Vercel (Production) + redeploy'
      : 'en .env.local y reinicia npm run dev'
  return parts.length > 0
    ? `Falta ${parts.join(' y ')} ${envHint}.`
    : `Configura Resend ${envHint}.`
}

type ResendEmailPayload = {
  from: string
  to: string[]
  subject: string
  html: string
  text: string
}

export async function sendResendEmail(payload: ResendEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY missing')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Resend error ${response.status}: ${body.slice(0, 200)}`)
  }
}

export function supportMailFromAddress(): string {
  return (
    process.env.SUPPORT_MAIL_FROM?.trim() ||
    'MotusDAO <contact@motusdao.org>'
  )
}