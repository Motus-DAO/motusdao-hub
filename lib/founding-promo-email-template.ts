import { SITE_URL } from '@/lib/constants'
import type { FoundingWaitlistRole } from '@prisma/client'

export type FoundingPromoEmailInput = {
  role: FoundingWaitlistRole
  email: string
  displayName: string
  position: number
  discountPercent: number
  code: string
  locale: 'es' | 'en'
}

function ctaUrl(role: FoundingWaitlistRole): string {
  const base = SITE_URL.replace(/\/$/, '')
  if (role === 'user') return `${base}/psychat?from=founding-code`
  return `${base}/academia?from=founding-code`
}

export function foundingPromoEmailSubject(input: FoundingPromoEmailInput): string {
  const isEn = input.locale === 'en'
  if (input.role === 'user') {
    return isEn
      ? `[Motus] Your Founding Allowlist code — User (#${input.position})`
      : `[Motus] Tu código Founding Allowlist — Usuario (#${input.position})`
  }
  return isEn
    ? `[Motus] Your Founding Allowlist code — Professional (#${input.position})`
    : `[Motus] Tu código Founding Allowlist — Profesional (#${input.position})`
}

export function buildFoundingPromoEmailContent(input: FoundingPromoEmailInput): {
  html: string
  text: string
} {
  const isEn = input.locale === 'en'
  const cta = ctaUrl(input.role)
  const product =
    input.role === 'user'
      ? isEn
        ? 'Psychat credit packs (5 or 10 USD)'
        : 'paquetes de crédito Psychat (5 o 10 USD)'
      : isEn
        ? 'paid Academy courses'
        : 'cursos de pago en Academia'

  const intro = isEn
    ? `Hi ${input.displayName}, your founding spot is #${input.position} with ${input.discountPercent}% off ${product}.`
    : `Hola ${input.displayName}, tu lugar fundador es el #${input.position} con ${input.discountPercent}% de descuento en ${product}.`

  const steps = isEn
    ? `Use this single-use code at Stripe Checkout:\n\n${input.code}\n\nSign in to MotusDAO Hub, start checkout, and paste the code when prompted.`
    : `Usa este código de un solo uso en Stripe Checkout:\n\n${input.code}\n\nInicia sesión en MotusDAO Hub, abre el pago y pega el código cuando lo pida Stripe.`

  const legal = isEn
    ? 'This discount does not replace clinical consent or PSM profile approval. Expiry follows campaign terms when set.'
    : 'Este descuento no sustituye consentimientos clínicos ni la aprobación de perfil PSM. La vigencia sigue los términos de campaña cuando aplique.'

  const text = `${intro}\n\n${steps}\n\n${cta}\n\n${legal}`

  const html = `<!DOCTYPE html>
<html lang="${input.locale}">
<body style="margin:0;background:#0b0b12;font-family:Inter,system-ui,sans-serif;color:#f4f4f5;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:linear-gradient(145deg,rgba(147,51,234,0.15),rgba(30,30,40,0.95));border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:28px;">
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">${intro}</p>
    <div style="background:#111;border-radius:12px;padding:16px;text-align:center;margin:16px 0;">
      <code style="font-size:18px;letter-spacing:0.04em;color:#e9d5ff;">${input.code}</code>
    </div>
    <p style="font-size:13px;line-height:1.5;color:#a1a1aa;">${steps.replace(/\n/g, '<br/>')}</p>
    <p style="margin:24px 0 0;"><a href="${cta}" style="display:inline-block;background:linear-gradient(90deg,#9333ea,#c026d3);color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">${isEn ? 'Open Hub' : 'Abrir el Hub'}</a></p>
    <p style="font-size:11px;color:#71717a;margin-top:24px;">${legal}</p>
  </div>
</body>
</html>`

  return { html, text }
}