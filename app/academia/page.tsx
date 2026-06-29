'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers3,
  Loader2,
  Play,
  Star,
} from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { CourseProgressBar } from '@/components/academy/CourseProgressBar'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { Section } from '@/components/ui/Section'
import {
  courseDuration,
  courseLessonCount,
  fetchPublishedCourses,
  fetchUserEnrollments,
  type EnrollmentSummary,
  type PublicCourse,
} from '@/lib/academy/public-course'
import { sortRouteBlockCourses } from '@/lib/academy/route-blocks'
import { fetchAppSession } from '@/lib/auth/client'

const difficultyLabels = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

function formatPrice(course: PublicCourse) {
  const amount = Number(course.priceAmount || 0)
  if (course.isFree || amount === 0) return 'Gratis'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: course.priceCurrency || 'MXN',
  }).format(amount)
}

function blockCtaLabel(enrollment: EnrollmentSummary | undefined) {
  if (!enrollment) return 'Ver bloque'
  if (enrollment.completed) return 'Revisar bloque'
  if (enrollment.progress > 0) return 'Continuar bloque'
  return 'Comenzar bloque'
}

export default function AcademiaPage() {
  const [courses, setCourses] = useState<PublicCourse[]>([])
  const [enrollmentsByCourseId, setEnrollmentsByCourseId] = useState<Map<string, EnrollmentSummary>>(
    () => new Map()
  )
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [resolved, setResolved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetchPublishedCourses(controller.signal, { force: true })
      .then((data) => {
        if (controller.signal.aborted) return
        setCourses(sortRouteBlockCourses(data))
        setResolved(true)
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) return
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setCourses([])
        setError(fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar los bloques')
        setResolved(true)
      })
      .finally(() => {
        if (controller.signal.aborted) return
        setLoading(false)
      })

    return () => controller.abort()
  }, [reloadKey])

  useEffect(() => {
    const controller = new AbortController()

    fetchAppSession()
      .then((session) => {
        if (!session.userId) {
          setEnrollmentsByCourseId(new Map())
          return []
        }
        return fetchUserEnrollments(session.userId, controller.signal, { force: true })
      })
      .then((enrollments) => {
        if (controller.signal.aborted || !enrollments) return
        const next = new Map<string, EnrollmentSummary>()
        for (const enrollment of enrollments) {
          next.set(enrollment.courseId, enrollment)
        }
        setEnrollmentsByCourseId(next)
      })
      .catch(() => {
        if (!controller.signal.aborted) setEnrollmentsByCourseId(new Map())
      })

    return () => controller.abort()
  }, [reloadKey])

  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(courses.map((course) => course.category || 'General'))).sort()],
    [courses]
  )
  const visibleCourses = selectedCategory === 'Todos'
    ? courses
    : courses.filter((course) => (course.category || 'General') === selectedCategory)
  const lessonCount = courses.reduce((total, course) => total + courseLessonCount(course), 0)
  const ratedCourses = courses.filter((course) => Number(course.rating || 0) > 0)
  const averageRating = ratedCourses.length > 0
    ? ratedCourses.reduce((total, course) => total + Number(course.rating || 0), 0) / ratedCourses.length
    : 0
  const completedCount = useMemo(
    () => Array.from(enrollmentsByCourseId.values()).filter((enrollment) => enrollment.completed).length,
    [enrollmentsByCourseId]
  )

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12 text-center"
          >
            <div className="mb-6 flex items-center justify-center">
              <div className="mr-4 flex h-16 w-16 items-center justify-center rounded-lg bg-green-600">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <div className="text-left">
                <GradientText as="h1" className="text-4xl font-bold md:text-5xl">
                  Academia MotusDAO
                </GradientText>
                <p className="text-muted-foreground">Aprende y crece en tu bienestar mental</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            {[
              { label: 'Bloques disponibles', value: courses.length, icon: BookOpen, color: 'text-blue-400' },
              { label: 'Lecciones publicadas', value: lessonCount, icon: Layers3, color: 'text-green-400' },
              {
                label: 'Bloques completados',
                value: enrollmentsByCourseId.size > 0 ? completedCount : '—',
                icon: CheckCircle2,
                color: 'text-emerald-400',
              },
              { label: 'Calificación promedio', value: averageRating > 0 ? averageRating.toFixed(1) : 'Nuevo', icon: Award, color: 'text-yellow-400' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <GlassCard key={stat.label} className="p-4 text-center sm:p-6">
                  <Icon className={`mx-auto mb-3 h-6 w-6 ${stat.color}`} />
                  <p className="text-2xl font-bold text-mauve-400">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
                </GlassCard>
              )
            })}
          </motion.div>

          {!loading && !error && courses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex flex-wrap justify-center gap-2"
            >
              {categories.map((category) => (
                <CTAButton
                  key={category}
                  variant={selectedCategory === category ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </CTAButton>
              ))}
            </motion.div>
          )}

          <div className="mb-6 flex items-center">
            <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
              <Play className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Bloques de la ruta PSM</h2>
          </div>

          {loading ? (
            <GlassCard className="flex min-h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando bloques...
            </GlassCard>
          ) : error ? (
            <GlassCard className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-red-300" />
              <h3 className="font-semibold">No pudimos cargar la Academia</h3>
              <p className="mb-5 mt-2 text-sm text-muted-foreground">{error}</p>
              <CTAButton onClick={() => setReloadKey((value) => value + 1)}>Reintentar</CTAButton>
            </GlassCard>
          ) : resolved && courses.length === 0 ? (
            <GlassCard className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
              <GraduationCap className="mb-3 h-12 w-12 text-mauve-400" />
              <h3 className="text-lg font-semibold">Próximamente nuevos bloques</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Estamos preparando contenido para la Academia MotusDAO. Vuelve pronto para conocer las novedades.
              </p>
            </GlassCard>
          ) : visibleCourses.length === 0 ? (
            <GlassCard className="p-8 text-center text-muted-foreground">
              No hay bloques publicados en esta categoría.
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleCourses.map((course, index) => {
                const duration = courseDuration(course)
                const lessons = courseLessonCount(course)
                const enrollment = enrollmentsByCourseId.get(course.id)
                const ctaLabel = blockCtaLabel(enrollment)
                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.06 }}
                  >
                    <Link href={`/academia/${course.slug}`} className="block h-full">
                      <GlassCard hover className="group h-full cursor-pointer overflow-hidden">
                        <div
                          role="img"
                          aria-label={course.title}
                          className="relative flex h-48 items-center justify-center bg-gradient-to-br from-mauve-500/20 to-iris-500/20 bg-cover bg-center"
                          style={course.imageUrl ? { backgroundImage: `url(${course.imageUrl})` } : undefined}
                        >
                          {enrollment?.completed && (
                            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-green-400/30 bg-green-600/90 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Completado
                            </div>
                          )}
                          {enrollment && !enrollment.completed && enrollment.progress > 0 && (
                            <div className="absolute right-3 top-3 rounded-full border border-mauve-400/30 bg-mauve-600/90 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
                              En progreso · {enrollment.progress}%
                            </div>
                          )}
                          {!course.imageUrl && (
                            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-mauve-500/80">
                              <Play className="h-8 w-8 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="p-6">
                          <div className="mb-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-mauve-500/20 px-3 py-1 text-xs font-medium text-mauve-400">
                              {course.category || 'General'}
                            </span>
                            {course.difficulty && (
                              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-muted-foreground">
                                {difficultyLabels[course.difficulty]}
                              </span>
                            )}
                            {enrollment?.completed && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-300">
                                <CheckCircle2 className="h-3 w-3" />
                                Finalizado
                              </span>
                            )}
                          </div>
                          <h3 className="mb-2 text-xl font-semibold transition-colors group-hover:text-mauve-400">
                            {course.title}
                          </h3>
                          <p className="mb-5 line-clamp-3 text-sm text-muted-foreground">{course.summary}</p>

                          {enrollment && (
                            <CourseProgressBar
                              progress={enrollment.progress}
                              completed={enrollment.completed}
                              compact
                              className="mb-4"
                            />
                          )}

                          <div className="mb-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{duration || '—'}{duration > 0 && ' min'}</span>
                            <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" />{lessons} lecciones</span>
                            <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" />{course.rating || 'Nuevo'}</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/10 pt-4">
                            <span className="font-semibold text-mauve-300">{formatPrice(course)}</span>
                            <span
                              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                                enrollment?.completed
                                  ? 'bg-green-600 group-hover:bg-green-500'
                                  : 'bg-mauve-500 group-hover:bg-mauve-400'
                              }`}
                            >
                              {ctaLabel}
                            </span>
                          </div>
                        </div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
