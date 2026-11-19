import { SITE_URL } from '@/lib/constants'
import type { FoundingWaitlistRole } from '@prisma/client'
import {
  buildMotusEmailCodeBlock,
  buildMotusEmailDocument,
  escapeHtml,
  MOTUS_EMAIL_BRAND,
} from '@/lib/motus-email-layout'

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
  const es = input.locale === 'es'
  const cta = ctaUrl(input.role)
  const name = escapeHtml(input.displayName)
  const code = input.code

  const product = es
    ? input.role === 'user'
      ? 'paquetes de crédito Psychat (5 o 10 USD)'
      : 'cursos de pago en Academia'
    : input.role === 'user'
      ? 'Psychat credit packs (5 or 10 USD)'
      : 'paid Academy courses'

  const headline = es ? 'Tu código Founding Allowlist' : 'Your Founding Allowlist code'
  const eyebrow =
    input.role === 'user'
      ? es
        ? 'Motus · Lista fundadora · Usuario'
        : 'Motus · Founding allowlist · User'
      : es
        ? 'Motus · Lista fundadora · Profesional'
        : 'Motus · Founding allowlist · Professional'

  const greeting = es ? `Hola ${name},` : `Hi ${name},`
  const lead = es
    ? `Tu posición es <strong style="color:${MOTUS_EMAIL_BRAND}">#${input.position}</strong> — <strong>${input.discountPercent}%</strong> de descuento en ${escapeHtml(product)}.`
    : `Your position is <strong style="color:${MOTUS_EMAIL_BRAND}">#${input.position}</strong> — <strong>${input.discountPercent}% off</strong> ${escapeHtml(product)}.`

  const steps = es
    ? 'Inicia sesión en MotusDAO Hub, abre el pago (Psychat o Academia) y pega el código cuando Stripe lo pida.'
    : 'Sign in to MotusDAO Hub, start checkout (Psychat or Academy), and paste the code when Stripe asks.'

  const codeLabel = es ? 'Código (un solo uso)' : 'Single-use code'
  const ctaLabel = es ? 'Abrir el Hub' : 'Open Hub'
  const foot = es
    ? 'El descuento no sustituye consentimientos clínicos ni la aprobación de perfil PSM; la vigencia sigue los términos de campaña cuando aplique.'
    : 'This discount does not replace clinical consent or PSM profile approval; validity follows campaign terms when set.'

  const bodyHtml = `<p style="margin:0 0 12px;">${greeting}</p>
<p style="margin:0 0 16px;">${lead}</p>
<p style="margin:0;color:#d4d4d8;">${escapeHtml(steps)}</p>`

  const html = buildMotusEmailDocument({
    lang: input.locale,
    eyebrow,
    title: headline,
    bodyHtml,
    codeBlockHtml: buildMotusEmailCodeBlock({ label: codeLabel, code }),
    prefooterHtml: foot,
    ctaHref: cta,
    ctaLabel,
    footLinkHref: cta,
    footLinkLabel: SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    signoff: 'MotusDAO Hub',
  })

  const text = es
    ? `Hola ${input.displayName},

Tu posición en la Motus Founding Allowlist es #${input.position} — ${input.discountPercent}% de descuento en ${product}.

Código de un solo uso en Stripe Checkout:

  ${code}

${steps}

${cta}

${foot}

— MotusDAO Hub`
    : `Hi ${input.displayName},

Your Motus Founding Allowlist position is #${input.position} — ${input.discountPercent}% off ${product}.

Single-use Stripe Checkout code:

  ${code}

${steps}

${cta}

${foot}

— MotusDAO Hub`

  return { html, text }
}