'use client'

import { ReactNode, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Play,
  Star,
  UserRound,
} from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { CourseProgressBar } from '@/components/academy/CourseProgressBar'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { Section } from '@/components/ui/Section'
import {
  courseDuration,
  courseLearningOutcomes,
  courseLessonCount,
  ensurePublishedCourse,
  fetchUserEnrollments,
  firstLessonSlug,
  type EnrollmentSummary,
  type PublicCourse,
} from '@/lib/academy/public-course'
import { authFetch, fetchAppSession } from '@/lib/auth/client'
import { findCachedCourseBySlug, isCoursesCacheFresh } from '@/lib/academy/courses-cache'
import { invalidateUserEnrollmentsCache } from '@/lib/academy/enrollments-cache'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { useWaaP } from '@/lib/contexts/WaaPProvider'

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

function CourseNotFound() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center px-6">
      <GlassCard className="max-w-md p-8 text-center">
        <BookOpen className="mx-auto mb-4 h-10 w-10 text-mauve-400" />
        <h1 className="mb-2 text-2xl font-bold">Curso no encontrado</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Este curso no existe o todavía no está publicado.
        </p>
        <Link href="/academia">
          <CTAButton>Volver a la Academia</CTAButton>
        </Link>
      </GlassCard>
    </div>
  )
}

function EnrollmentCTA({
  course,
  enrollment,
  enrolling,
  actionError,
  signError,
  sessionState,
  signing,
  onEnroll,
  onLogin,
  onSignIn,
}: {
  course: PublicCourse
  enrollment: EnrollmentSummary | null
  enrolling: boolean
  actionError: string | null
  signError: string | null
  sessionState: string
  signing: boolean
  onEnroll: () => void
  onLogin: () => void
  onSignIn: () => void
}) {
  const continueSlug = firstLessonSlug(course)
  const priceLabel = formatPrice(course)

  if (enrollment) {
    return (
      <>
        <CourseProgressBar
          progress={enrollment.progress}
          completed={enrollment.completed}
          className="mb-4"
        />
        {continueSlug ? (
          <Link href={`/academia/${course.slug}/leccion/${continueSlug}`}>
            <CTAButton size="lg" className="w-full gap-2">
              <Play className="h-4 w-4" />
              {enrollment.completed
                ? 'Revisar curso'
                : enrollment.progress > 0
                  ? 'Continuar curso'
                  : 'Comenzar curso'}
            </CTAButton>
          </Link>
        ) : (
          <CTAButton size="lg" className="w-full" disabled>
            Contenido próximamente
          </CTAButton>
        )}
      </>
    )
  }

  return (
    <>
      <p className="mb-4 text-center text-sm text-muted-foreground">
        {priceLabel === 'Gratis' ? 'Acceso gratuito' : `${priceLabel} — inscripción sin pago en v1`}
      </p>
      {sessionState === 'no_wallet' ? (
        <CTAButton size="lg" className="w-full" onClick={onLogin}>
          Iniciar sesión para inscribirse
        </CTAButton>
      ) : sessionState === 'needs_signature' ? (
        <CTAButton size="lg" className="w-full gap-2" onClick={onSignIn} disabled={signing}>
          {signing && <Loader2 className="h-4 w-4 animate-spin" />}
          Firmar para inscribirse
        </CTAButton>
      ) : (
        <CTAButton size="lg" className="w-full gap-2" onClick={onEnroll} disabled={enrolling}>
          {enrolling && <Loader2 className="h-4 w-4 animate-spin" />}
          Inscribirse
        </CTAButton>
      )}
      {(actionError || signError) && (
        <p className="mt-3 text-center text-xs text-red-300">{actionError || signError}</p>
      )}
    </>
  )
}

function CourseDetailView({
  course,
  enrollment,
  onEnroll,
  enrolling,
  actionError,
  signError,
  sessionState,
  signing,
  onLogin,
  onSignIn,
}: {
  course: PublicCourse
  enrollment: EnrollmentSummary | null
  onEnroll: () => void
  enrolling: boolean
  actionError: string | null
  signError: string | null
  sessionState: string
  signing: boolean
  onLogin: () => void
  onSignIn: () => void
}) {
  const lessonCount = courseLessonCount(course)
  const duration = courseDuration(course)
  const outcomes = courseLearningOutcomes(course)

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Link href="/academia">
              <CTAButton variant="secondary" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a la Academia
              </CTAButton>
            </Link>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
            <div className="space-y-8">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="overflow-hidden">
                  <div
                    role="img"
                    aria-label={course.title}
                    className="flex h-64 items-center justify-center bg-gradient-to-br from-mauve-500/20 to-iris-500/20 bg-cover bg-center"
                    style={course.imageUrl ? { backgroundImage: `url(${course.imageUrl})` } : undefined}
                  >
                    {!course.imageUrl && (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-mauve-500/80">
                        <GraduationCap className="h-10 w-10 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="mb-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-mauve-500/20 px-3 py-1 text-sm font-medium text-mauve-400">
                        {course.category || 'General'}
                      </span>
                      {course.difficulty && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-muted-foreground">
                          {difficultyLabels[course.difficulty]}
                        </span>
                      )}
                    </div>
                    <GradientText as="h1" className="mb-3 text-3xl font-bold md:text-4xl">
                      {course.title}
                    </GradientText>
                    <p className="mb-3 text-lg text-muted-foreground">{course.summary}</p>
                    {course.description && (
                      <p className="text-sm leading-7 text-muted-foreground">{course.description}</p>
                    )}

                    <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 sm:grid-cols-4">
                      <div>
                        <p className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 text-mauve-400" />{lessonCount}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Lecciones</p>
                      </div>
                      <div>
                        <p className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4 text-mauve-400" />{duration || '—'}{duration > 0 && ' min'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Duración</p>
                      </div>
                      <div>
                        <p className="flex items-center gap-2 font-semibold"><Star className="h-4 w-4 text-yellow-500" />{course.rating || 'Nuevo'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{course.reviewCount || 0} reseñas</p>
                      </div>
                      <div>
                        <p className="font-semibold text-mauve-300">{formatPrice(course)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Acceso</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {outcomes.length > 0 && (
                <GlassCard className="p-6">
                  <h2 className="mb-4 text-xl font-semibold">Lo que aprenderás</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {outcomes.map((outcome) => (
                      <div key={outcome} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                        <span>{outcome}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              <div>
                <h2 className="mb-4 text-2xl font-bold">Contenido del curso</h2>
                {course.modules.length === 0 ? (
                  <GlassCard className="p-6 text-sm text-muted-foreground">
                    El contenido de este curso se publicará próximamente.
                  </GlassCard>
                ) : (
                  <div className="space-y-4">
                    {course.modules.map((module, moduleIndex) => (
                      <GlassCard key={module.id} className="overflow-hidden">
                        <div className="border-b border-white/10 px-5 py-4">
                          <p className="text-xs font-medium uppercase text-mauve-400">Módulo {moduleIndex + 1}</p>
                          <h3 className="mt-1 text-lg font-semibold">{module.title}</h3>
                          {module.summary && <p className="mt-1 text-sm text-muted-foreground">{module.summary}</p>}
                        </div>
                        <div className="divide-y divide-white/10">
                          {module.lessons.length === 0 ? (
                            <p className="px-5 py-4 text-sm text-muted-foreground">Sin lecciones publicadas.</p>
                          ) : module.lessons.map((lesson, lessonIndex) => (
                            <Link
                              key={lesson.id}
                              href={`/academia/${course.slug}/leccion/${lesson.slug}`}
                              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/5"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mauve-500/15 text-xs font-semibold text-mauve-300">
                                  {lessonIndex + 1}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{lesson.title}</p>
                                  {lesson.summary && <p className="mt-1 truncate text-xs text-muted-foreground">{lesson.summary}</p>}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                                {lesson.isFreePreview && (
                                  <span className="rounded-full bg-green-500/15 px-2 py-1 text-green-300">Vista previa</span>
                                )}
                                <span>{lesson.duration == null ? '—' : `${lesson.duration} min`}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside>
              <GlassCard className="sticky top-24 p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mauve-500/20">
                    <UserRound className="h-5 w-5 text-mauve-300" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Instructor</p>
                    <p className="font-semibold">{course.instructor || 'MotusDAO'}</p>
                    {course.instructorTitle && <p className="text-xs text-muted-foreground">{course.instructorTitle}</p>}
                  </div>
                </div>
                {course.instructorBio && <p className="mb-6 text-sm text-muted-foreground">{course.instructorBio}</p>}
                <EnrollmentCTA
                  course={course}
                  enrollment={enrollment}
                  enrolling={enrolling}
                  actionError={actionError}
                  signError={signError}
                  sessionState={sessionState}
                  signing={signing}
                  onEnroll={onEnroll}
                  onLogin={onLogin}
                  onSignIn={onSignIn}
                />
              </GlassCard>
            </aside>
          </div>
        </div>
      </Section>
    </div>
  )
}

export function PublicCourseDetail({ slug, fallback }: { slug: string; fallback?: ReactNode }) {
  const { login, authenticated, ready } = useWaaP()
  const { sessionState, signing, signError, signIn, isSessionReady } = useSiweSession()

  const [course, setCourse] = useState<PublicCourse | null>(() => findCachedCourseBySlug(slug))
  const [enrollment, setEnrollment] = useState<EnrollmentSummary | null>(null)
  const [loading, setLoading] = useState(() => findCachedCourseBySlug(slug) === null)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadEnrollment = useCallback(async (courseId: string, signal?: AbortSignal) => {
    if (signal?.aborted) return
    if (!isSessionReady) {
      setEnrollment(null)
      return
    }

    const session = await fetchAppSession()
    if (!session.userId) {
      setEnrollment(null)
      return
    }

    const enrollments = await fetchUserEnrollments(session.userId, signal)
    if (signal?.aborted) return
    const match = enrollments.find((item) => item.courseId === courseId) ?? null
    setEnrollment(match)
  }, [isSessionReady])

  useEffect(() => {
    if (!slug) return

    const controller = new AbortController()
    const cached = findCachedCourseBySlug(slug)
    if (cached) {
      setCourse(cached)
    }

    const skipNetwork = Boolean(cached && isCoursesCacheFresh())
    if (!cached) {
      setLoading(true)
    }
    setMissing(false)
    setError(null)

    if (skipNetwork) {
      void loadEnrollment(cached!.id, controller.signal).finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
      return () => controller.abort()
    }

    ensurePublishedCourse(slug, controller.signal)
      .then(async (match) => {
        if (controller.signal.aborted) return
        setCourse(match)
        setMissing(!match)
        if (match) await loadEnrollment(match.id, controller.signal)
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) return
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el curso')
      })
      .finally(() => {
        if (controller.signal.aborted) return
        setLoading(false)
      })

    return () => controller.abort()
  }, [slug, loadEnrollment])

  useEffect(() => {
    if (course) void loadEnrollment(course.id)
  }, [course, isSessionReady, loadEnrollment])

  const handleEnroll = async () => {
    if (!course) return
    setEnrolling(true)
    setActionError(null)

    try {
      if (!authenticated) {
        await login()
        setActionError('Inicia sesión para inscribirte.')
        return
      }

      if (!isSessionReady) {
        const signed = await signIn()
        if (!signed) return
      }

      const session = await fetchAppSession()
      if (!session.userId) {
        setActionError('No se pudo vincular tu sesión. Intenta firmar de nuevo.')
        return
      }

      const response = await authFetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.userId, courseId: course.id }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || 'No se pudo completar la inscripción')
      }

      const body = (await response.json()) as { enrollment?: EnrollmentSummary }
      invalidateUserEnrollmentsCache()
      setEnrollment(body.enrollment ?? null)
    } catch (enrollError) {
      setActionError(enrollError instanceof Error ? enrollError.message : 'Error al inscribirse')
    } finally {
      setEnrolling(false)
    }
  }

  if (loading && !course) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando curso...
      </div>
    )
  }
  if (error && !course) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center px-6">
        <GlassCard className="max-w-md p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold">No pudimos cargar el curso</h1>
          <p className="mb-6 text-sm text-muted-foreground">{error}</p>
          <Link href="/academia"><CTAButton>Volver a la Academia</CTAButton></Link>
        </GlassCard>
      </div>
    )
  }
  if (course) {
    return (
      <CourseDetailView
        course={course}
        enrollment={enrollment}
        onEnroll={() => void handleEnroll()}
        enrolling={enrolling}
        actionError={actionError}
        signError={signError}
        sessionState={ready ? sessionState : 'loading'}
        signing={signing}
        onLogin={() => void login()}
        onSignIn={() => void signIn()}
      />
    )
  }
  if (missing && !loading) {
    if (fallback) return fallback
    return <CourseNotFound />
  }

  return (
    <div className="flex min-h-[65vh] items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando curso...
    </div>
  )
}
