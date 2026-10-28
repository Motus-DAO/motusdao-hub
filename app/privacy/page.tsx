import type { Metadata } from 'next'
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout'
import { renderLegalMarkdown } from '@/lib/legal/load-legal-markdown'

export const metadata: Metadata = {
  title: 'Aviso de privacidad — MotusDAO Hub',
  description: 'Aviso de privacidad integral conforme a LFPDPPP para datos sensibles de salud mental.',
}

export default function PrivacyPage() {
  const html = renderLegalMarkdown('aviso-de-privacidad-integral.md')
  return (
    <LegalDocumentLayout
      title="Aviso de privacidad integral"
      subtitle="Protección de datos personales y datos sensibles de salud mental"
      html={html}
      relatedLinks={[
        { href: '/terms', label: 'Términos de uso' },
        { href: '/subprocesadores', label: 'Subprocesadores' },
        { href: '/cookies', label: 'Cookies' },
      ]}
    />
  )
}
