import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import {
  getEspecialidadLabel,
  PSM_ESPECIALIDADES,
} from '@/lib/intake/psm-intake-options'
import { PUBLIC_PSM_WHERE } from '@/lib/psm/public-profile'
import { PLATFORM_SESSION_PRICE_USD } from '@/lib/constants'

type PageProps = { params: Promise<{ specialty: string }> }

export function generateStaticParams() {
  return PSM_ESPECIALIDADES.map((s) => ({ specialty: s.value }))
}

export async function generateMetadata({ params }: PageProps) {
  const { specialty } = await params
  const label = getEspecialidadLabel(specialty)
  return {
    title: `Psicólogos online especialistas en ${label} | MotusDAO`,
    description: `Encuentra psicólogos verificados para ${label} por teleterapia en LATAM. Sesiones desde $${PLATFORM_SESSION_PRICE_USD} USD.`,
  }
}

export default async function SpecialtyHubPage({ params }: PageProps) {
  const { specialty } = await params
  const valid = PSM_ESPECIALIDADES.some((s) => s.value === specialty)
  if (!valid) notFound()

  const label = getEspecialidadLabel(specialty)

  const allTherapists = await prisma.user.findMany({
    where: PUBLIC_PSM_WHERE,
    include: { profile: true, psm: true },
    take: 100,
  })

  const therapists = allTherapists.filter((t) => {
    const top = Array.isArray(t.psm?.topSpecialties)
      ? (t.psm.topSpecialties as string[])
      : []
    const all = Array.isArray(t.psm?.especialidades)
      ? (t.psm.especialidades as string[])
      : []
    return top.includes(specialty) || all.includes(specialty)
  })

  return (
    <Section>
      <div className="container mx-auto px-6 py-12">
        <GradientText as="h1" className="mb-4 text-3xl font-bold">
          Psicólogos online — {label}
        </GradientText>
        <p className="mb-8 max-w-2xl text-muted-foreground">
          Terapeutas verificados en MotusDAO que trabajan con {label.toLowerCase()}. Todas las
          sesiones son por videollamada desde ${PLATFORM_SESSION_PRICE_USD} USD.
        </p>

        {therapists.length === 0 ? (
          <GlassCard className="p-8 text-center text-muted-foreground">
            Próximamente habrá profesionales disponibles en esta especialidad.
          </GlassCard>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {therapists.map((t) => (
              <li key={t.id}>
                <Link href={`/psicoterapia/${t.psm?.slug}`}>
                  <GlassCard className="p-4 transition-colors hover:border-mauve-400/40">
                    <p className="font-semibold">
                      {t.profile?.nombre} {t.profile?.apellido}
                    </p>
                    <p className="text-sm text-muted-foreground">Ver perfil completo →</p>
                  </GlassCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}
