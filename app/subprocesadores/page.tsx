import type { Metadata } from 'next'
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout'
import { renderLegalMarkdown } from '@/lib/legal/load-legal-markdown'

export const metadata: Metadata = {
  title: 'Subprocesadores — MotusDAO Hub',
}

export default function SubprocessorsPage() {
  const html = renderLegalMarkdown('subprocesadores.md')
  return (
    <LegalDocumentLayout
      title="Subprocesadores y encargados"
      subtitle="Terceros que pueden tratar datos al operar el Hub"
      html={html}
      relatedLinks={[{ href: '/privacy', label: 'Aviso de privacidad integral' }]}
    />
  )
}
