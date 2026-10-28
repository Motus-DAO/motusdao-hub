import type { Metadata } from 'next'
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout'
import { renderLegalMarkdown } from '@/lib/legal/load-legal-markdown'

export const metadata: Metadata = {
  title: 'Términos de uso — MotusDAO Hub',
}

export default function TermsPage() {
  const html = renderLegalMarkdown('terminos-de-uso.md')
  return (
    <LegalDocumentLayout
      title="Términos de uso"
      subtitle="Condiciones del servicio MotusDAO Hub"
      html={html}
      relatedLinks={[{ href: '/privacy', label: 'Aviso de privacidad' }]}
    />
  )
}
