import { MIN_REVIEWS_FOR_AVERAGE } from '@/lib/constants'

export type ReputationSummary = {
  reviewCount: number
  patientCount: number
  completedSessions: number
  averageRating: number | null
  showStars: boolean
  label: string
}

export function computeReputationSummary(input: {
  reviewCount: number
  patientCount: number
  completedSessions: number
  ratingSum: number
}): ReputationSummary {
  const { reviewCount, patientCount, completedSessions, ratingSum } = input

  if (reviewCount === 0) {
    return {
      reviewCount: 0,
      patientCount,
      completedSessions,
      averageRating: null,
      showStars: false,
      label: 'Sin opiniones aún',
    }
  }

  if (reviewCount < MIN_REVIEWS_FOR_AVERAGE) {
    return {
      reviewCount,
      patientCount,
      completedSessions,
      averageRating: null,
      showStars: false,
      label: `Valoración en construcción (${reviewCount} ${reviewCount === 1 ? 'opinión' : 'opiniones'})`,
    }
  }

  const averageRating = Math.round((ratingSum / reviewCount) * 10) / 10
  return {
    reviewCount,
    patientCount,
    completedSessions,
    averageRating,
    showStars: true,
    label: `${averageRating}`,
  }
}
