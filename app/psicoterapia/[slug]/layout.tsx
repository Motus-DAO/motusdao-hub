import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { PLATFORM_SESSION_PRICE_USD, SITE_URL } from '@/lib/constants'
import { getEspecialidadLabel } from '@/lib/intake/psm-intake-options'
import { asStringArray } from '@/lib/prisma-json'
import { TherapistJsonLd } from '@/components/psicoterapia/TherapistJsonLd'
import {
  buildPublicPsmProfile,
  getPsmReputationStats,
  PUBLIC_PSM_WHERE,
} from '@/lib/psm/public-profile'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = await params

  const user = await prisma.user.findFirst({
    where: {
      ...PUBLIC_PSM_WHERE,
      psm: { is: { slug } },
    },
    include: { profile: true, psm: true, psmMatches: { where: { status: 'active' } } },
  })

  if (!user?.profile || !user.psm) {
    return { title: 'Profesional no encontrado | MotusDAO' }
  }

  const top = asStringArray(user.psm.topSpecialties)
  const specialty =
    top.length > 0 ? getEspecialidadLabel(top[0]) : 'salud mental'
  const name = `${user.profile.nombre} ${user.profile.apellido}`.trim()

  const title = `${name} | Psicólogo online ${specialty} | MotusDAO`
  const description = `${name}, psicólogo online. Especialista en ${specialty}. Teleterapia por video. $${PLATFORM_SESSION_PRICE_USD} USD/sesión. Agenda tu cita en MotusDAO.`

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/psicoterapia/${slug}`,
      images: user.profile.avatarUrl ? [{ url: user.profile.avatarUrl }] : undefined,
      locale: 'es',
      type: 'profile',
    },
    alternates: {
      canonical: `${SITE_URL}/psicoterapia/${slug}`,
    },
  }
}

export default async function TherapistProfileLayout({ children, params }: LayoutProps) {
  const { slug } = await params

  const user = await prisma.user.findFirst({
    where: {
      ...PUBLIC_PSM_WHERE,
      psm: { is: { slug } },
    },
    include: { profile: true, psm: true, psmMatches: { where: { status: 'active' } } },
  })

  let jsonLd = null
  if (user?.psm) {
    const reputationStats = await getPsmReputationStats(user.id)
    jsonLd = await buildPublicPsmProfile(user, reputationStats, user.psmMatches.length)
  }

  return (
    <>
      {jsonLd && <TherapistJsonLd profile={jsonLd} />}
      {children}
    </>
  )
}
