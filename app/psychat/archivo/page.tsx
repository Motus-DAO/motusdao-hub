import Link from 'next/link'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { PsychatArchiveHelp } from '@/components/psychat/PsychatArchiveHelp'
import { PsychatInferencePrivacyHelp } from '@/components/psychat/PsychatInferencePrivacyHelp'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Psychat — copias, IA y privacidad — MotusDAO',
  description:
    'Copia cifrada opcional, cómo Psychat llama al modelo de IA, y modos de privacidad TEE y E2EE en Motus Hub.',
}

export default function PsychatArchivoHelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6 max-w-2xl py-12 space-y-10">
          <Link
            href="/psychat"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Psychat
          </Link>
          <div className="space-y-3">
            <GradientText as="h1" className="text-3xl font-bold">
              Psychat: copias y privacidad
            </GradientText>
            <p className="text-sm text-muted-foreground max-w-xl">
              Dos temas en una sola guía: (1) respaldo cifrado opcional del chat en tu cuenta Motus, y (2) qué
              pasa cuando la IA te responde — inferencia, proveedor externo, y modos TEE / E2EE.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Copia cifrada (respaldo)</h2>
            <PsychatArchiveHelp showRecoverCta />
          </div>

          <div className="space-y-4 border-t border-border pt-10">
            <h2 className="text-lg font-semibold text-foreground">Inferencia y privacidad al chatear</h2>
            <PsychatInferencePrivacyHelp />
          </div>
        </div>
      </Section>
    </div>
  )
}
