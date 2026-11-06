import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/constants'
import { PSM_ESPECIALIDADES, PSM_PAISES } from '@/lib/intake/psm-intake-options'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, '')

  // The build must not fail when Postgres is unreachable (CI uses a placeholder
  // DATABASE_URL, and a bad certificate should not block a deploy). Serving the
  // static routes is better than failing the whole prerender.
  let profiles: Array<{ slug: string | null; updatedAt: Date }> = []
  try {
    profiles = await prisma.pSMProfile.findMany({
      where: {
        slug: { not: null },
        verificationStatus: 'approved',
        introVideoApproved: true,
        isAcceptingPatients: true,
      },
      select: { slug: true, updatedAt: true },
    })
  } catch (error) {
    console.warn(
      '[sitemap] PSM profiles unavailable; serving static routes only:',
      error instanceof Error ? error.message : error
    )
  }

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
