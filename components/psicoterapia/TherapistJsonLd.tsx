import type { PublicPsmProfile } from '@/lib/psm/public-profile'
import { LATAM_CRISIS_RESOURCES } from '@/lib/crisis-resources'
import { PLATFORM_SESSION_PRICE_USD, SITE_URL } from '@/lib/constants'

export function TherapistJsonLd({ profile }: { profile: PublicPsmProfile }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: profile.fullName,
    medicalSpecialty: profile.topSpecialtyLabels,
    description: profile.tagline || profile.narratives.conQueTrabajo.slice(0, 200),
    image: profile.avatarUrl,
    areaServed: profile.licenseCountryLabel
      ? { '@type': 'Country', name: profile.licenseCountryLabel }
      : undefined,
    availableService: {
      '@type': 'MedicalTherapy',
      name: 'Teleterapia por videollamada',
      offers: {
        '@type': 'Offer',
        price: PLATFORM_SESSION_PRICE_USD,
        priceCurrency: 'USD',
      },
    },
    ...(profile.reputation.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: profile.reputation.averageRating,
            reviewCount: profile.reputation.reviewCount,
          },
        }
      : {}),
    ...(profile.introVideoUrl
      ? {
          video: {
            '@type': 'VideoObject',
            name: `Presentación de ${profile.fullName}`,
            contentUrl: profile.introVideoUrl,
          },
        }
      : {}),
    url: `${SITE_URL}/psicoterapia/${profile.slug}`,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
