'use client'

import { useParams } from 'next/navigation'
import { LessonPlayer } from '@/components/academy/LessonPlayer'

export default function LessonPage() {
  const params = useParams<{ courseId: string; lessonSlug: string }>()
  return <LessonPlayer courseSlug={params.courseId} lessonSlug={params.lessonSlug} />
}
