/** Motus transactional email shell (Lab / Avril pattern + light/dark). */

export const MOTUS_EMAIL_BRAND = '#a855f7'
export const MOTUS_EMAIL_BRAND_ACCENT = '#c084fc'
export const MOTUS_EMAIL_CANVAS_DARK = '#0b0b12'
export const MOTUS_EMAIL_CARD_DARK = '#14121c'
export const MOTUS_EMAIL_MUTED_DARK = '#a1a1aa'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const EMAIL_HEAD_STYLES = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: light) {
    .motus-email-canvas { background: #f4f4f5 !important; }
    .motus-email-card {
      background: #ffffff !important;
      border-color: #e4e4e7 !important;
    }
    .motus-email-title { color: #18181b !important; }
    .motus-email-body { color: #3f3f46 !important; }
    .motus-email-body strong { color: #18181b !important; }
    .motus-email-eyebrow { color: #7c3aed !important; }
    .motus-email-code-wrap {
      background: #f5f3ff !important;
      border-color: #ddd6fe !important;
    }
    .motus-email-code { color: #5b21b6 !important; }
    .motus-email-muted { color: #71717a !important; }
    .motus-email-signoff { color: #52525b !important; }
    .motus-email-footlink { color: #6b7280 !important; }
    .motus-email-cta { color: #fafafa !important; }
  }
`

export type MotusEmailDocumentInput = {
  lang: 'en' | 'es'
  eyebrow: string
  title: string
  bodyHtml: string
  codeBlockHtml?: string
  prefooterHtml?: string
  ctaHref?: string
  ctaLabel?: string
  footLinkHref?: string
  footLinkLabel?: string
  signoff?: string
}

/**
 * Table-based HTML for Resend (dark default; `prefers-color-scheme: light` overrides).
 */
export function buildMotusEmailDocument(input: MotusEmailDocumentInput): string {
  const cta =
    input.ctaHref && input.ctaLabel
      ? `<tr>
            <td style="padding:0 28px 28px;" align="center">
              <a href="${escapeHtml(input.ctaHref)}" class="motus-email-cta" style="display:inline-block;padding:12px 24px;background:linear-gradient(90deg,${MOTUS_EMAIL_BRAND},${MOTUS_EMAIL_BRAND_ACCENT});color:#fafafa;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;text-decoration:none;border-radius:999px;">${escapeHtml(input.ctaLabel)}</a>
            </td>
          </tr>`
      : ''

  const codeRow = input.codeBlockHtml
    ? `<tr>
            <td style="padding:0 28px 24px;">
              ${input.codeBlockHtml}
            </td>
          </tr>`
    : ''

  const prefooter = input.prefooterHtml
    ? `<p class="motus-email-muted" style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${MOTUS_EMAIL_MUTED_DARK};">${input.prefooterHtml}</p>`
    : ''

  const signoff = escapeHtml(input.signoff ?? 'MotusDAO Hub')
  const footHref = input.footLinkHref ? escapeHtml(input.footLinkHref) : ''
  const footLabel = escapeHtml(input.footLinkLabel ?? input.footLinkHref ?? 'MotusDAO')
  const footLink = footHref
    ? `<a href="${footHref}" style="color:${MOTUS_EMAIL_BRAND};text-decoration:none;">${footLabel}</a>`
    : footLabel

  return `<!DOCTYPE html>
<html lang="${input.lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(input.title)}</title>
  <style type="text/css">${EMAIL_HEAD_STYLES}</style>
</head>
<body class="motus-email-canvas" style="margin:0;padding:0;background:${MOTUS_EMAIL_CANVAS_DARK};font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" class="motus-email-canvas" width="100%" cellspacing="0" cellpadding="0" style="background:${MOTUS_EMAIL_CANVAS_DARK};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="motus-email-card" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${MOTUS_EMAIL_CARD_DARK};border:1px solid rgba(255,255,255,0.12);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,${MOTUS_EMAIL_BRAND},${MOTUS_EMAIL_BRAND_ACCENT});font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p class="motus-email-eyebrow" style="margin:0 0 8px;font-family:Inter,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${MOTUS_EMAIL_BRAND_ACCENT};">${escapeHtml(input.eyebrow)}</p>
              <h1 class="motus-email-title" style="margin:0 0 20px;font-family:Inter,sans-serif;font-size:22px;font-weight:600;color:#f4f4f5;line-height:1.3;">${escapeHtml(input.title)}</h1>
              <div class="motus-email-body" style="font-size:15px;line-height:1.55;color:#e4e4e7;">${input.bodyHtml}</div>
            </td>
          </tr>
          ${codeRow}
          ${cta}
          <tr>
            <td style="padding:0 28px 24px;border-top:1px solid rgba(255,255,255,0.08);">
              ${prefooter}
              <p class="motus-email-signoff" style="margin:12px 0 0;font-size:13px;color:#a1a1aa;">— ${signoff}</p>
            </td>
          </tr>
        </table>
        <p class="motus-email-footlink" style="margin:16px 0 0;font-size:11px;color:#52525b;max-width:520px;text-align:center;">${footLink}</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildMotusEmailCodeBlock(input: {
  label: string
  code: string
}): string {
  const code = escapeHtml(input.code)
  const label = escapeHtml(input.label)
  return `<p class="motus-email-muted" style="margin:0 0 8px;font-size:12px;color:${MOTUS_EMAIL_MUTED_DARK};text-transform:uppercase;letter-spacing:0.06em;">${label}</p>
              <div class="motus-email-code-wrap" style="padding:16px 20px;background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.35);border-radius:12px;text-align:center;">
                <span class="motus-email-code" style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:18px;font-weight:600;color:#f5f3ff;letter-spacing:0.04em;">${code}</span>
              </div>`
}