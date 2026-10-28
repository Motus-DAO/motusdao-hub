'use client'

import Link from 'next/link'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { ArrowLeft } from 'lucide-react'

export default function PsychatMemoriaContextoPage() {
  return (
    <Section className="py-10">
      <div className="mx-auto max-w-2xl space-y-6 px-4 text-sm text-muted-foreground">
        <Link href="/psychat" className="inline-flex items-center gap-1 text-mauve-400 underline">
          <ArrowLeft className="h-4 w-4" />
          Volver a Psychat
        </Link>

        <GradientText as="h1" className="text-3xl font-semibold">
          Memoria de contexto
        </GradientText>
        <p>
          Elige dónde vive el contexto largo del asistente. Configúralo desde Psychat con el botón{' '}
          <strong className="text-foreground">Memoria: …</strong> (no hace falta recordar esta URL).
        </p>

        <GlassCard className="space-y-3 p-6">
          <p className="font-medium text-foreground">Dos terminales</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Hub: <code className="text-xs">npm run dev</code> o abre tu deploy.
            </li>
            <li>
              Proxy: en Psychat → <strong className="text-foreground">Memoria</strong> → copia el comando{' '}
              <code className="text-xs">npx -p @rootrouter/proxy@beta rootrouter-proxy</code> con{' '}
              <code className="text-xs">ROOTROUTER_UPSTREAM_ORIGIN</code> = URL del Hub.
            </li>
            <li>
              <code className="text-xs">curl http://127.0.0.1:8787/healthz</code> debe responder ok.
            </li>
          </ol>
          <CTAButton asChild className="mt-2">
            <Link href="/psychat">Abrir Psychat</Link>
          </CTAButton>
        </GlassCard>

        <GlassCard className="space-y-2 p-6">
          <p className="font-medium text-foreground">Documentación completa (equipo / auditoría)</p>
          <p>
            Markdown en el repo:{' '}
            <code className="text-xs">docs/guides/psychat-memoria-contexto-es.md</code> y{' '}
            <code className="text-xs">docs/architecture/psychat-rootrouter-context.md</code>
          </p>
        </GlassCard>
      </div>
    </Section>
  )
}
