import Link from 'next/link'
import { Section } from '@/components/ui/Section'
import { GlassCard } from '@/components/ui/GlassCard'
import { MOTUS_LEGAL_LAST_UPDATED } from '@/lib/legal/constants'

type LegalDocumentLayoutProps = {
  title: string
  subtitle?: string
  html: string
  relatedLinks?: { href: string; label: string }[]
}

export function LegalDocumentLayout({
  title,
  subtitle,
  html,
  relatedLinks = [],
}: LegalDocumentLayoutProps) {
  return (
    <Section className="py-12 md:py-16">
      <div className="max-w-3xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{title}</h1>
          {subtitle ? (
            <p className="text-muted-foreground text-lg">{subtitle}</p>
          ) : null}
          <p className="text-sm text-muted-foreground mt-4">
            Última actualización: {MOTUS_LEGAL_LAST_UPDATED}
          </p>
        </header>

        <GlassCard className="p-6 md:p-10 prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground max-w-none legal-prose">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </GlassCard>

        {relatedLinks.length > 0 ? (
          <nav className="mt-8 flex flex-wrap gap-4 text-sm">
            {relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-mauve-400 hover:text-mauve-300 underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </Section>
  )
}
