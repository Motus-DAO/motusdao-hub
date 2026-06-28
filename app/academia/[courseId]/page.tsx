'use client'

import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { PublicCourseDetail } from '@/components/academy/PublicCourseDetail'

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>()
  const slug = params.courseId

  if (!slug) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando curso...
      </div>
    )
  }

  return <PublicCourseDetail slug={slug} />
}
