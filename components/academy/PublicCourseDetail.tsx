'use client'

import { ReactNode, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
  Loader2,
  Play,
  Star,
  UserRound,
} from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { CheckoutSuccessPanel } from '@/components/academy/CheckoutSuccessPanel'
import { CourseProgressBar } from '@/components/academy/CourseProgressBar'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { Section } from '@/components/ui/Section'
import {
  courseRequiresPayment,
  formatCoursePrice,
} from '@/lib/academy/course-pricing'
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
import { renderMarkdown } from '@/lib/academy/markdown'
import { resolveRouteBlockSlug } from '@/lib/academy/route-blocks'
import { invalidateUserEnrollmentsCache } from '@/lib/academy/enrollments-cache'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { useWallet } from '@/lib/wallet'

const difficultyLabels = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

function formatPrice(course: PublicCourse) {
  return formatCoursePrice(course)
}

function CourseNotFound() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center px-6">
      <GlassCard className="max-w-md p-8 text-center">
        <BookOpen className="mx-auto mb-4 h-10 w-10 text-mauve-400" />
        <h1 className="mb-2 text-2xl font-bold">Bloque no encontrado</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Este bloque no existe o todavía no está publicado.
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
  paymentConfirming,
  redirectingToCourse,
  actionError,
  signError,
  sessionState,
  signing,
  stripeEnabled,
  checkoutSuccess,
  checkoutPhase,
  onEnroll,
  onLogin,
  onSignIn,
}: {
  course: PublicCourse
  enrollment: EnrollmentSummary | null
  enrolling: boolean
  paymentConfirming: boolean
  redirectingToCourse: boolean
  actionError: string | null
  signError: string | null
  sessionState: string
  signing: boolean
  stripeEnabled: boolean
  checkoutSuccess: boolean
  checkoutPhase: 'activating' | 'ready' | 'error'
  onEnroll: () => void
  onLogin: () => void
  onSignIn: () => void
}) {
  const continueSlug = firstLessonSlug(course)
  const priceLabel = formatPrice(course)
  const paidCourse = courseRequiresPayment(course)
  const usesStripeCheckout = paidCourse && stripeEnabled

  if (enrollment) {
    return (
      <>
        {checkoutSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mb-4 rounded-xl border border-green-400/30 bg-green-500/10 p-4 text-center"
          >
            <div className="mb-2 flex items-center justify-center gap-2 text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-semibold">¡Acceso activado!</span>
            </div>
            <p className="text-xs text-green-200/90">
              {redirectingToCourse
                ? 'Redirigiendo al contenido del curso...'
                : 'Ya puedes comenzar a aprender.'}
            </p>
          </motion.div>
        )}
        <CourseProgressBar
          progress={enrollment.progress}
          completed={enrollment.completed}
          className="mb-4"
        />
        {continueSlug ? (
          <Link href={`/academia/${course.slug}/leccion/${continueSlug}`}>
            <CTAButton size="lg" className="w-full gap-2">
              {redirectingToCourse ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {redirectingToCourse
                ? 'Abriendo curso...'
                : enrollment.completed
                  ? 'Revisar bloque'
                  : enrollment.progress > 0
                    ? 'Continuar bloque'
                    : 'Comenzar bloque'}
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

  if (checkoutSuccess && !enrollment) {
    return <CheckoutSuccessPanel phase={checkoutPhase} errorMessage={actionError} />
  }

  return (
    <>
      <p className="mb-4 text-center text-sm text-muted-foreground">
        {priceLabel === 'Gratis'
          ? 'Acceso gratuito'
          : usesStripeCheckout
            ? `${priceLabel} — pago seguro con Stripe`
            : `${priceLabel} — inscripción sin pago en v1`}
      </p>
      {sessionState === 'no_wallet' ? (
        <CTAButton size="lg" className="w-full" onClick={onLogin}>
          Iniciar sesión para {usesStripeCheckout ? 'comprar' : 'inscribirse'}
        </CTAButton>
      ) : sessionState === 'needs_signature' ? (
        <CTAButton size="lg" className="w-full gap-2" onClick={onSignIn} disabled={signing}>
          {signing && <Loader2 className="h-4 w-4 animate-spin" />}
          Firmar para {usesStripeCheckout ? 'comprar' : 'inscribirse'}
        </CTAButton>
      ) : (
        <CTAButton
          size="lg"
          className="w-full gap-2"
          onClick={onEnroll}
          disabled={enrolling || paymentConfirming}
        >
          {(enrolling || paymentConfirming) && <Loader2 className="h-4 w-4 animate-spin" />}
          {usesStripeCheckout ? (
            <>
              {paymentConfirming ? (
                'Confirmando acceso...'
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Comprar e inscribirse
                </>
              )}
            </>
          ) : (
            'Inscribirse'
          )}
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
  paymentConfirming,
  redirectingToCourse,
  actionError,
  signError,
  sessionState,
  signing,
  stripeEnabled,
  checkoutSuccess,
  checkoutPhase,
  onLogin,
  onSignIn,
}: {
  course: PublicCourse
  enrollment: EnrollmentSummary | null
  onEnroll: () => void
  enrolling: boolean
  paymentConfirming: boolean
  redirectingToCourse: boolean
  actionError: string | null
  signError: string | null
  sessionState: string
  signing: boolean
  stripeEnabled: boolean
  checkoutSuccess: boolean
  checkoutPhase: 'activating' | 'ready' | 'error'
  onLogin: () => void
  onSignIn: () => void
}) {
  const lessonCount = courseLessonCount(course)
  const duration = courseDuration(course)
  const outcomes = courseLearningOutcomes(course)
  const descriptionHtml = course.description ? renderMarkdown(course.description) : ''

  return (
    <div className="min-h-screen bg-background">
      <Section padding="md">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-4 sm:mb-6"
          >
            <Link href="/academia">
              <CTAButton variant="secondary" size="sm" className="max-w-full">
                <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">Volver a la Academia</span>
              </CTAButton>
            </Link>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:gap-8">
            <aside className="order-first lg:order-none lg:col-start-2 lg:row-start-1">
              <GlassCard className="p-4 sm:p-6 lg:sticky lg:top-24">
                <div className="mb-4 flex items-center gap-3 sm:mb-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mauve-500/20 sm:h-11 sm:w-11">
                    <UserRound className="h-5 w-5 text-mauve-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Instructor</p>
                    <p className="truncate font-semibold">{course.instructor || 'MotusDAO'}</p>
                    {course.instructorTitle && (
                      <p className="truncate text-xs text-muted-foreground">{course.instructorTitle}</p>
                    )}
                  </div>
                </div>
                {course.instructorBio && (
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground sm:mb-6">
                    {course.instructorBio}
                  </p>
                )}
                <EnrollmentCTA
                  course={course}
                  enrollment={enrollment}
                  enrolling={enrolling}
                  paymentConfirming={paymentConfirming}
                  redirectingToCourse={redirectingToCourse}
                  actionError={actionError}
                  signError={signError}
                  sessionState={sessionState}
                  signing={signing}
                  stripeEnabled={stripeEnabled}
                  checkoutSuccess={checkoutSuccess}
                  checkoutPhase={checkoutPhase}
                  onEnroll={onEnroll}
                  onLogin={onLogin}
                  onSignIn={onSignIn}
                />
              </GlassCard>
            </aside>

            <div className="order-last space-y-6 sm:space-y-8 lg:order-none">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="overflow-hidden">
                  <div
                    role="img"
                    aria-label={course.title}
                    className="aspect-[16/9] w-full bg-gradient-to-br from-mauve-500/20 to-iris-500/20 bg-cover bg-center sm:aspect-[2/1]"
                    style={course.imageUrl ? { backgroundImage: `url(${course.imageUrl})` } : undefined}
                  >
                    {!course.imageUrl && (
                      <div className="flex h-full min-h-[10rem] items-center justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-mauve-500/80 sm:h-20 sm:w-20">
                          <GraduationCap className="h-8 w-8 text-white sm:h-10 sm:w-10" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-6 md:p-8">
                    <div className="mb-3 flex flex-wrap gap-2 sm:mb-4">
                      <span className="rounded-full bg-mauve-500/20 px-3 py-1 text-xs font-medium text-mauve-400 sm:text-sm">
                        {course.category || 'General'}
                      </span>
                      {course.difficulty && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-muted-foreground sm:text-sm">
                          {difficultyLabels[course.difficulty]}
                        </span>
                      )}
                    </div>
                    <GradientText as="h1" className="mb-3 text-2xl font-bold sm:text-3xl md:text-4xl">
                      {course.title}
                    </GradientText>
                    <p className="mb-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
                      {course.summary}
                    </p>
                    {descriptionHtml && (
                      <div
                        className="academy-prose academy-prose-summary"
                        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                      />
                    )}

                    <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-4 sm:gap-4 sm:pt-6">
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
                <GlassCard className="p-4 sm:p-6">
                  <h2 className="mb-4 text-lg font-semibold sm:text-xl">Lo que aprenderás</h2>
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
                <h2 className="mb-4 text-xl font-bold sm:text-2xl">Contenido del bloque</h2>
                {course.modules.length === 0 ? (
                  <GlassCard className="p-6 text-sm text-muted-foreground">
                    El contenido de este bloque se publicará próximamente.
                  </GlassCard>
                ) : (
                  <div className="space-y-4">
                    {course.modules.map((module, moduleIndex) => (
                      <GlassCard key={module.id} className="overflow-hidden">
                        <div className="border-b border-white/10 px-4 py-4 sm:px-5">
                          <p className="text-xs font-medium uppercase text-mauve-400">Módulo {moduleIndex + 1}</p>
                          <h3 className="mt-1 text-base font-semibold sm:text-lg">{module.title}</h3>
                          {module.summary && <p className="mt-1 text-sm text-muted-foreground">{module.summary}</p>}
                        </div>
                        <div className="divide-y divide-white/10">
                          {module.lessons.length === 0 ? (
                            <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">Sin lecciones publicadas.</p>
                          ) : module.lessons.map((lesson, lessonIndex) => (
                            <Link
                              key={lesson.id}
                              href={`/academia/${course.slug}/leccion/${lesson.slug}`}
                              className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mauve-500/15 text-xs font-semibold text-mauve-300">
                                  {lessonIndex + 1}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium leading-snug sm:truncate">{lesson.title}</p>
                                  {lesson.summary && (
                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:truncate">
                                      {lesson.summary}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2 pl-11 text-xs text-muted-foreground sm:gap-3 sm:pl-0">
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
          </div>
        </div>
      </Section>
    </div>
  )
}

export function PublicCourseDetail({ slug: rawSlug, fallback }: { slug: string; fallback?: ReactNode }) {
  const slug = resolveRouteBlockSlug(rawSlug)
  const { login, authenticated, ready } = useWallet()
  const { sessionState, signing, signError, signIn, isSessionReady } = useSiweSession()

  const [course, setCourse] = useState<PublicCourse | null>(() => findCachedCourseBySlug(slug))
  const [enrollment, setEnrollment] = useState<EnrollmentSummary | null>(null)
  const [loading, setLoading] = useState(() => findCachedCourseBySlug(slug) === null)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [paymentConfirming, setPaymentConfirming] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const [redirectingToCourse, setRedirectingToCourse] = useState(false)
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null)

  useEffect(() => {
    void fetch('/api/stripe/status')
      .then((response) => response.json())
      .then((body: { enabled?: boolean }) => setStripeEnabled(Boolean(body.enabled)))
      .catch(() => setStripeEnabled(false))
  }, [])

  const loadEnrollment = useCallback(async (courseId: string, signal?: AbortSignal, force = false) => {
    if (signal?.aborted) return
    if (!isSessionReady) {
      setEnrollment(null)
      return null
    }

    const session = await fetchAppSession()
    if (!session.userId) {
      setEnrollment(null)
      return null
    }

    const enrollments = await fetchUserEnrollments(session.userId, signal, force ? { force: true } : undefined)
    if (signal?.aborted) return
    const match = enrollments.find((item) => item.courseId === courseId) ?? null
    setEnrollment(match)
    return match
  }, [isSessionReady])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      setCheckoutSuccess(true)
      const sessionId = params.get('session_id')
      if (sessionId) setCheckoutSessionId(sessionId)
    }
  }, [])

  useEffect(() => {
    if (!checkoutSuccess || !course || enrollment || !isSessionReady || !checkoutSessionId) return

    let cancelled = false
    setPaymentConfirming(true)
    setActionError(null)

    const run = async () => {
      try {
        const confirmResponse = await authFetch('/api/stripe/confirm-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: checkoutSessionId }),
        })

        if (confirmResponse.ok) {
          const body = (await confirmResponse.json()) as { enrollment?: EnrollmentSummary }
          if (body.enrollment && !cancelled) {
            invalidateUserEnrollmentsCache()
            setEnrollment(body.enrollment)
            setPaymentConfirming(false)
            window.history.replaceState({}, '', `/academia/${course.slug}`)
            return
          }
        }
      } catch {
        // Continue with read-only polling below.
      }

      const delays = [800, 1200, 1800, 2500, 3500, 5000]
      for (const delay of delays) {
        if (cancelled) return
        await new Promise((resolve) => window.setTimeout(resolve, delay))

        try {
          const statusResponse = await authFetch(
            `/api/stripe/checkout-status?sessionId=${encodeURIComponent(checkoutSessionId)}`
          )
          if (statusResponse.ok) {
            const status = (await statusResponse.json()) as { enrollment?: EnrollmentSummary | null }
            if (status.enrollment && !cancelled) {
              invalidateUserEnrollmentsCache()
              setEnrollment(status.enrollment)
              setPaymentConfirming(false)
              window.history.replaceState({}, '', `/academia/${course.slug}`)
              return
            }
          }
        } catch {
          // Keep polling.
        }

        invalidateUserEnrollmentsCache()
        const match = await loadEnrollment(course.id, undefined, true)
        if (match && !cancelled) {
          setPaymentConfirming(false)
          window.history.replaceState({}, '', `/academia/${course.slug}`)
          return
        }
      }

      if (!cancelled) {
        setPaymentConfirming(false)
        setActionError('Tu pago fue recibido. Recarga la página en unos segundos para acceder al curso.')
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [checkoutSuccess, checkoutSessionId, course, enrollment, loadEnrollment, isSessionReady])

  useEffect(() => {
    if (!checkoutSuccess || !enrollment || !course) return

    const lessonSlug = firstLessonSlug(course)
    if (!lessonSlug) return

    setRedirectingToCourse(true)
    const timer = window.setTimeout(() => {
      window.location.href = `/academia/${course.slug}/leccion/${lessonSlug}`
    }, 1400)

    return () => {
      window.clearTimeout(timer)
      setRedirectingToCourse(false)
    }
  }, [checkoutSuccess, enrollment, course])

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
        setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el bloque')
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

      let session = await fetchAppSession()
      if (!session.authenticated) {
        const signed = await signIn()
        if (!signed) return
        session = await fetchAppSession()
      }

      if (!session.userId) {
        setActionError('No se pudo vincular tu sesión. Intenta firmar de nuevo.')
        return
      }

      if (courseRequiresPayment(course) && stripeEnabled) {
        const response = await authFetch('/api/stripe/checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.userId, courseId: course.id }),
        })

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error || 'No se pudo iniciar el pago')
        }

        const body = (await response.json()) as { url?: string }
        if (!body.url) {
          throw new Error('No se recibió la URL de pago')
        }

        window.location.href = body.url
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
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando bloque...
      </div>
    )
  }
  if (error && !course) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center px-6">
        <GlassCard className="max-w-md p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold">No pudimos cargar el bloque</h1>
          <p className="mb-6 text-sm text-muted-foreground">{error}</p>
          <Link href="/academia"><CTAButton>Volver a la Academia</CTAButton></Link>
        </GlassCard>
      </div>
    )
  }
  const handleSignInAndEnroll = async () => {
    const signed = await signIn()
    if (!signed) return
    await handleEnroll()
  }

  const checkoutPhase: 'activating' | 'ready' | 'error' = checkoutSuccess
    ? enrollment
      ? 'ready'
      : actionError
        ? 'error'
        : 'activating'
    : 'activating'

  if (course) {
    return (
      <CourseDetailView
        course={course}
        enrollment={enrollment}
        onEnroll={() => void handleEnroll()}
        enrolling={enrolling}
        paymentConfirming={paymentConfirming}
        redirectingToCourse={redirectingToCourse}
        actionError={actionError}
        signError={signError}
        sessionState={ready ? sessionState : 'loading'}
        signing={signing}
        stripeEnabled={stripeEnabled}
        checkoutSuccess={checkoutSuccess}
        checkoutPhase={checkoutPhase}
        onLogin={() => void login()}
        onSignIn={() => void handleSignInAndEnroll()}
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
