import Link from 'next/link'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { BitacoraBackupHelp } from '@/components/bitacora/BitacoraBackupHelp'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Copia cifrada de bitácora — MotusDAO',
  description:
    'Cómo exportar, guardar y recuperar tu diario personal cifrado con tu wallet.',
}

export default function BitacoraComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6 max-w-2xl py-12 space-y-6">
          <Link
            href="/bitacora"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Mi Bitácora
          </Link>
          <GradientText as="h1" className="text-3xl font-bold">
            Copia de respaldo de tu bitácora
          </GradientText>
          <BitacoraBackupHelp />
        </div>
      </Section>
    </div>
  )
}
