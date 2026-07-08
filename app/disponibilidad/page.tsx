'use client'

import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { AvailabilityManager } from '@/components/psm/AvailabilityManager'

export default function DisponibilidadPage() {
  return (
    <Section className="py-10">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-2 text-3xl font-bold">
          <GradientText>Disponibilidad</GradientText>
        </h1>
        <p className="mb-8 text-muted-foreground">
          Publica los horarios en los que los pacientes pueden agendar sesión contigo en Psicoterapia.
        </p>
        <AvailabilityManager />
      </div>
    </Section>
  )
}
