import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/constants'
import { PSM_ESPECIALIDADES, PSM_PAISES } from '@/lib/intake/psm-intake-options'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, '')

  const profiles = await prisma.pSMProfile.findMany({
    where: {
      slug: { not: null },
      verificationStatus: 'approved',
      introVideoApproved: true,
      isAcceptingPatients: true,
    },
    select: { slug: true, updatedAt: true },
  })

  const profileEntries: MetadataRoute.Sitemap = profiles
    .filter((p): p is { slug: string; updatedAt: Date } => Boolean(p.slug))
    .map((p) => ({
      url: `${base}/psicoterapia/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

  const specialtyEntries: MetadataRoute.Sitemap = PSM_ESPECIALIDADES.map((s) => ({
    url: `${base}/psicoterapia/especialidades/${s.value}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const countryEntries: MetadataRoute.Sitemap = PSM_PAISES.map((c) => ({
    url: `${base}/psicoterapia/pais/${c.value}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [
    { url: `${base}/psicoterapia`, changeFrequency: 'daily', priority: 0.9 },
    ...profileEntries,
    ...specialtyEntries,
    ...countryEntries,
  ]
}
