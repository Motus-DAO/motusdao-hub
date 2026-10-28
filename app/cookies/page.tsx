import type { Metadata } from 'next'
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout'
import { renderLegalMarkdown } from '@/lib/legal/load-legal-markdown'

export const metadata: Metadata = {
  title: 'Cookies — MotusDAO Hub',
}

export default function CookiesPage() {
  const html = renderLegalMarkdown('cookies.md')
  return (
    <LegalDocumentLayout
      title="Política de cookies"
      html={html}
      relatedLinks={[{ href: '/privacy', label: 'Aviso de privacidad' }]}
    />
  )
}
