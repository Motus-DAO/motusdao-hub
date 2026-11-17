import type { FoundingWaitlistEntry } from '@prisma/client'
import {
  buildFoundingPromoEmailContent,
  foundingPromoEmailSubject,
} from '@/lib/founding-promo-email-template'
import {
  sendResendEmail,
  supportMailFromAddress,
  supportMailPlumbingReady,
} from '@/lib/support-mail'

export async function sendFoundingPromoCodeEmail(
  entry: FoundingWaitlistEntry,
  code: string
): Promise<void> {
  if (!supportMailPlumbingReady()) {
    throw new Error('Mail no configurado (SUPPORT_MAIL_ENABLED + RESEND_API_KEY).')
  }

  const locale = entry.locale === 'en' ? 'en' : 'es'
  const input = {
    role: entry.role,
    email: entry.email,
    displayName: entry.displayName,
    position: entry.position,
    discountPercent: entry.discountPercent,
    code,
    locale,
  } as const

  const subject = foundingPromoEmailSubject(input)
  const { html, text } = buildFoundingPromoEmailContent(input)

  await sendResendEmail({
    from: supportMailFromAddress(),
    to: [entry.email],
    subject,
    html,
    text,
  })

  console.log(
    JSON.stringify({
      scope: 'motus.hub.founding_mail_sent',
      kind: entry.role === 'user' ? 'founding_code_user' : 'founding_code_psm',
      ticketId: entry.id,
    })
  )
}