'use client'

import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { AvailabilityManager } from '@/components/psm/AvailabilityManager'

export default function DisponibilidadPage() {
  return (
    <Section>
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">
          <GradientText>Disponibilidad</GradientText>
        </h1>
        <p className="mb-6 text-muted-foreground sm:mb-8">
          Publica los horarios en los que los pacientes pueden agendar sesión contigo en Psicoterapia.
        </p>
        <AvailabilityManager />
      </div>
    </Section>
  )
}
