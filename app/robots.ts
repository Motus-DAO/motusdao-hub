import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/$/, '')
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/psicoterapia', '/psicoterapia/'],
      disallow: ['/admin/', '/api/', '/onboarding/', '/perfil'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
