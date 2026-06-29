import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { getPaisLabel, PSM_PAISES } from '@/lib/intake/psm-intake-options'
import { PUBLIC_PSM_WHERE } from '@/lib/psm/public-profile'
import { PLATFORM_SESSION_PRICE_USD } from '@/lib/constants'

type PageProps = { params: Promise<{ country: string }> }

export function generateStaticParams() {
  return PSM_PAISES.map((c) => ({ country: c.value }))
}

export async function generateMetadata({ params }: PageProps) {
  const { country } = await params
  const label = getPaisLabel(country)
  return {
    title: `Psicólogos online con licencia en ${label} | MotusDAO`,
    description: `Psicólogos verificados con licencia en ${label}. Teleterapia por video desde $${PLATFORM_SESSION_PRICE_USD} USD/sesión.`,
  }
}

export default async function CountryHubPage({ params }: PageProps) {
  const { country } = await params
  const valid = PSM_PAISES.some((c) => c.value === country)
  if (!valid) notFound()

  const label = getPaisLabel(country)

  const allTherapists = await prisma.user.findMany({
    where: PUBLIC_PSM_WHERE,
    include: { profile: true, psm: true },
    take: 100,
  })

  const therapists = allTherapists.filter((t) => {
    const licensed = Array.isArray(t.psm?.licensedCountries)
      ? (t.psm.licensedCountries as string[])
      : []
    return licensed.includes(country)
  })

  return (
    <Section>
      <div className="container mx-auto px-6 py-12">
        <GradientText as="h1" className="mb-4 text-3xl font-bold">
          Psicólogos online — licencia {label}
        </GradientText>
        <p className="mb-8 max-w-2xl text-muted-foreground">
          Profesionales con credenciales en {label} que ofrecen teleterapia en MotusDAO.
        </p>

        {therapists.length === 0 ? (
          <GlassCard className="p-8 text-center text-muted-foreground">
            Próximamente habrá profesionales con licencia en {label}.
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
