'use client'

import Link from 'next/link'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react'

export default function PsychatMemoriaContextoPage() {
  return (
    <Section className="py-10">
      <div className="mx-auto max-w-2xl space-y-8 px-4 text-sm leading-relaxed text-muted-foreground">
        <Link href="/psychat" className="inline-flex items-center gap-1 text-mauve-400 underline">
          <ArrowLeft className="h-4 w-4" />
          Volver a Psychat
        </Link>

        <div>
          <GradientText as="h1" className="text-3xl font-semibold">
            Memoria del asistente
          </GradientText>
          <p className="mt-3">
            La mayoría usa el modo normal. Si quieres el contexto largo en <strong className="text-foreground">tu
            computadora</strong>, elige memoria local: Psychat en el navegador y un comando en terminal.
          </p>
        </div>

        <GlassCard className="space-y-4 p-6 border-emerald-400/20">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-medium text-foreground">Modo normal (recomendado)</p>
              <p className="mt-1">
                En Psychat, botón <strong className="text-foreground">Memoria: Estándar (Hub)</strong>. El chat de
                esta pestaña vive en tu navegador; Motus responde con crédito de IA.{' '}
                <strong className="text-foreground">No abres terminales.</strong>
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="space-y-4 p-6">
          <div className="flex items-start gap-2">
            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-mauve-400" />
            <div>
              <p className="font-medium text-foreground">Modo avanzado — memoria en tu computadora (RootRouter)</p>
              <p className="mt-1">
                Solo si quieres que el <em>historial largo</em> se guarde en un archivo local (
                <code className="text-xs">store.json</code>) en tu Mac/PC, no en servidores Motus. Requiere un
                programita en segundo plano (puerto 8787). Tú lo apagas cuando quieras.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground">Si eliges modo avanzado</p>
            <ol className="list-none space-y-4 pl-0">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mauve-500/20 text-xs font-semibold text-mauve-200">
                  1
                </span>
                <span>
                  Abre <Link href="/psychat" className="text-mauve-400 underline">Psychat</Link>, entra con wallet y
                  acepta el consentimiento de IA.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mauve-500/20 text-xs font-semibold text-mauve-200">
                  2
                </span>
                <span>
                  Pulsa <strong className="text-foreground">Memoria: …</strong> →{' '}
                  <strong className="text-foreground">Memoria local</strong> → copia el comando → pégalo en terminal y
                  déjalo corriendo. Usa «Probar conexión» antes de guardar.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mauve-500/20 text-xs font-semibold text-mauve-200">
                  3
                </span>
                <span>
                  En el mismo modal: <strong className="text-foreground">Probar conexión</strong> → marca la casilla →{' '}
                  <strong className="text-foreground">Guardar</strong>. Usa privacidad <strong className="text-foreground">estándar (TEE)</strong>, no reforzada (E2EE).
                </span>
              </li>
            </ol>
          </div>

          <p className="text-xs">
            ¿Falló? Casi siempre el proxy no está encendido o cerraste la terminal. Vuelve al paso 2.
          </p>
        </GlassCard>

        <GlassCard className="space-y-3 p-6">
          <p className="font-medium text-foreground">No confundir con…</p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>
              <strong className="text-foreground">Ajustes avanzados → TEE / E2EE</strong>: cómo viaja un mensaje a la
              IA (Venice). Otra cosa.
            </li>
            <li>
              <strong className="text-foreground">Copia cifrada</strong> en tu cuenta Motus: respaldo del chat, otra
              llave. Ver <Link href="/psychat/archivo" className="underline text-mauve-400">Psychat → archivo</Link>.
            </li>
          </ul>
        </GlassCard>

        <div className="flex flex-col gap-3 sm:flex-row">
          <CTAButton asChild className="flex-1">
            <Link href="/psychat">Ir a Psychat</Link>
          </CTAButton>
        </div>

        <p className="text-xs border-t border-white/10 pt-4">
          Documentación para el equipo (Markdown en el repo, listo para publicar / RAG):{' '}
          <code className="text-[11px]">docs/chat-data/README.md</code> ·{' '}
          <code className="text-[11px]">docs/guides/psychat-memoria-contexto-es.md</code>
        </p>
      </div>
    </Section>
  )
}
