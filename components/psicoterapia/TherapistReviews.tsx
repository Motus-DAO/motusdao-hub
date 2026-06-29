'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import type { ReputationSummary } from '@/lib/psm/reputation'

type ReviewItem = {
  id: string
  rating: number
  comment: string | null
  authorLabel: string
  issueTags: string[]
  createdAt: string
}

type Props = {
  slug: string
  initialReputation: ReputationSummary
}

export function TherapistReviews({ slug, initialReputation }: Props) {
  const [reputation, setReputation] = useState(initialReputation)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/psm/${slug}/reviews`)
        const data = await res.json()
        if (res.ok) {
          setReputation(data.reputation)
          setReviews(data.reviews || [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  return (
    <GlassCard className="p-6">
      <h2 className="mb-4 text-xl font-semibold">Opiniones</h2>

      <div className="mb-4 flex items-center gap-2">
        {reputation.showStars ? (
          <>
            <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
            <span className="font-semibold">{reputation.label}</span>
            <span className="text-sm text-muted-foreground">
              ({reputation.reviewCount}{' '}
              {reputation.reviewCount === 1 ? 'opinión' : 'opiniones'})
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">{reputation.label}</span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando opiniones...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay opiniones públicas. Sé el primero en compartir tu experiencia después de tu
          sesión.
        </p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="border-t border-white/10 pt-4 first:border-0 first:pt-0">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < review.rating
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-white/20'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{review.authorLabel}</span>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}
