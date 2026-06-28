'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Lock,
} from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { CourseProgressBar } from '@/components/academy/CourseProgressBar'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { Section } from '@/components/ui/Section'
import { renderMarkdown, videoEmbedUrl } from '@/lib/academy/markdown'
import { fetchLessonMediaUrl } from '@/lib/academy/media-client'
import type { PdfResource } from '@/lib/academy/media'
import {
  fetchLessonProgress,
  markLessonCompleteApi,
  migrateLegacyLocalProgress,
} from '@/lib/academy/lesson-progress'
import { findCachedCourseBySlug, isCoursesCacheFresh } from '@/lib/academy/courses-cache'
import { invalidateUserEnrollmentsCache } from '@/lib/academy/enrollments-cache'
import {
  ensurePublishedCourse,
  fetchGatedLesson,
  fetchUserEnrollments,
  getNextLesson,
  type EnrollmentSummary,
  type GatedLessonResponse,
  type PublicCourse,
} from '@/lib/academy/public-course'
import { authFetch, fetchAppSession } from '@/lib/auth/client'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { useWaaP } from '@/lib/contexts/WaaPProvider'

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  return error instanceof Error && error.name === 'AbortError'
}

function LessonNotFound() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center px-6">
      <GlassCard className="max-w-md p-8 text-center">
        <BookOpen className="mx-auto mb-4 h-10 w-10 text-mauve-400" />
        <h1 className="mb-2 text-2xl font-bold">Lección no encontrada</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Esta lección no existe o todavía no está publicada.
        </p>
        <Link href="/academia">
          <CTAButton>Volver a la Academia</CTAButton>
        </Link>
      </GlassCard>
    </div>
  )
}

function LockedLessonPanel({
  courseSlug,
  onEnroll,
  enrolling,
}: {
  courseSlug: string
  onEnroll: () => void
  enrolling: boolean
}) {
  return (
    <GlassCard className="p-8 text-center">
      <Lock className="mx-auto mb-4 h-10 w-10 text-mauve-400" />
      <h2 className="mb-2 text-xl font-semibold">Contenido bloqueado</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Inscríbete en el curso para acceder a esta lección.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <CTAButton onClick={onEnroll} disabled={enrolling} className="gap-2">
          {enrolling && <Loader2 className="h-4 w-4 animate-spin" />}
          Inscribirse al curso
        </CTAButton>
        <Link href={`/academia/${courseSlug}`}>
          <CTAButton variant="secondary">Ver curso</CTAButton>
        </Link>
      </div>
    </GlassCard>
  )
}

function VideoEmbed({ url }: { url: string }) {
  const embed = videoEmbedUrl(url)
  if (!embed) return null

  if (embed.type === 'iframe') {
    return (
      <div className="mb-6 aspect-video overflow-hidden rounded-lg border border-white/10">
        <iframe
          src={embed.src}
          title="Video de la lección"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-white/10">
      <video src={embed.src} controls className="w-full" preload="metadata">
        <track kind="captions" />
      </video>
    </div>
  )
}

function PdfResourcesPanel({
  lessonId,
  resources,
}: {
  lessonId: string
  resources: PdfResource[]
}) {
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)

  if (resources.length === 0) return null

  const handleOpen = async (resource: PdfResource) => {
    setOpeningId(resource.id)
    setOpenError(null)
    try {
      const signedUrl = await fetchLessonMediaUrl(lessonId, resource.storagePath)
      window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : 'No se pudo abrir el PDF')
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Recursos descargables</h3>
      <ul className="space-y-2">
        {resources.map((resource) => (
          <li key={resource.id}>
            <button
              type="button"
              onClick={() => void handleOpen(resource)}
              disabled={openingId === resource.id}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-mauve-200 hover:bg-white/10 disabled:opacity-60"
            >
              {openingId === resource.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">{resource.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {openError && <p className="mt-2 text-xs text-red-300">{openError}</p>}
    </div>
  )
}

export function LessonPlayer({ courseSlug, lessonSlug }: { courseSlug: string; lessonSlug: string }) {
  const { login, authenticated, ready } = useWaaP()
  const { sessionState, signing, signError, signIn, isSessionReady } = useSiweSession()

  const [course, setCourse] = useState<PublicCourse | null>(() => findCachedCourseBySlug(courseSlug))
  const [lessonData, setLessonData] = useState<GatedLessonResponse | null>(null)
  const [enrollment, setEnrollment] = useState<EnrollmentSummary | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)

  const [loading, setLoading] = useState(() => findCachedCourseBySlug(courseSlug) === null)
  const [refreshing, setRefreshing] = useState(false)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [markingComplete, setMarkingComplete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isLessonComplete = lessonData ? completedIds.has(lessonData.lesson.id) : false

  const loadProgress = useCallback(
    async (activeEnrollment: EnrollmentSummary, activeUserId: string, courseId: string, signal?: AbortSignal) => {
      const migrated = await migrateLegacyLocalProgress({
        userId: activeUserId,
        courseId,
        enrollmentId: activeEnrollment.id,
        signal,
      })
      if (signal?.aborted) return

      const progress = migrated ?? (await fetchLessonProgress(activeEnrollment.id, signal))
      if (signal?.aborted) return

      setCompletedIds(new Set(progress.completedLessonIds))
      setEnrollment({
        ...activeEnrollment,
        progress: progress.progress,
        completed: progress.completed,
      })
    },
    []
  )

  const loadData = useCallback(async (signal?: AbortSignal, isRefresh = false) => {
    const cached = findCachedCourseBySlug(courseSlug)
    if (cached) {
      setCourse(cached)
    }

    if (isRefresh) {
      setRefreshing(true)
    } else if (!cached) {
      setLoading(true)
    }
    setMissing(false)
    setError(null)

    try {
      const coursePromise = cached && isCoursesCacheFresh()
        ? Promise.resolve(cached)
        : ensurePublishedCourse(courseSlug, signal)

      const [match, gated, session] = await Promise.all([
        coursePromise,
        fetchGatedLesson(courseSlug, lessonSlug, signal),
        fetchAppSession(),
      ])

      if (signal?.aborted) return

      if (!match) {
        setMissing(true)
        return
      }

      setCourse(match)
      setLessonData(gated)
      setEnrollment(gated.enrollment ?? null)
      setLoading(false)
      setRefreshing(false)

      if (!session.userId) return

      setUserId(session.userId)

      let activeEnrollment = gated.enrollment ?? null
      if (!activeEnrollment) {
        const enrollments = await fetchUserEnrollments(session.userId, signal)
        if (signal?.aborted) return
        activeEnrollment = enrollments.find((item) => item.courseId === match.id) ?? null
        if (activeEnrollment) setEnrollment(activeEnrollment)
      }

      if (activeEnrollment) {
        await loadProgress(activeEnrollment, session.userId, match.id, signal)
      }
    } catch (fetchError) {
      if (signal?.aborted || isAbortError(fetchError)) return
      if (fetchError instanceof Error && fetchError.message === 'NOT_FOUND') {
        setMissing(true)
        return
      }
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar la lección')
    } finally {
      if (signal?.aborted) return
      setLoading(false)
      setRefreshing(false)
    }
  }, [courseSlug, lessonSlug, loadProgress])

  useEffect(() => {
    const controller = new AbortController()
    const isRefresh = Boolean(course)
    void loadData(controller.signal, isRefresh).catch((error) => {
      if (isAbortError(error)) return
    })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- course ref tracks whether initial load happened
  }, [courseSlug, lessonSlug, loadData])

  const ensureSession = async (): Promise<string | null> => {
    if (!ready) return null
    if (!authenticated) {
      await login()
      return null
    }

    let session = await fetchAppSession()
    if (!session.authenticated) {
      const signed = await signIn()
      if (!signed) return null
      session = await fetchAppSession()
    }

    if (!session.userId) return null
    setUserId(session.userId)
    return session.userId
  }

  const handleEnroll = async () => {
    if (!course) return
    setEnrolling(true)
    setActionError(null)

    try {
      const activeUserId = userId || (await ensureSession())
      if (!activeUserId) {
        setActionError('Inicia sesión para inscribirte al curso.')
        return
      }

      const response = await authFetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, courseId: course.id }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || 'No se pudo completar la inscripción')
      }

      const body = (await response.json()) as { enrollment?: EnrollmentSummary }
      const created = body.enrollment ?? null
      invalidateUserEnrollmentsCache()
      setEnrollment(created)
      if (created && activeUserId) {
        await loadProgress(created, activeUserId, course.id)
      } else {
        await loadData()
      }
    } catch (enrollError) {
      setActionError(enrollError instanceof Error ? enrollError.message : 'Error al inscribirse')
    } finally {
      setEnrolling(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!course || !lessonData || !lessonData.access.allowed) return

    setMarkingComplete(true)
    setActionError(null)

    try {
      const activeUserId = userId || (await ensureSession())
      if (!activeUserId) {
        setActionError('Inicia sesión para guardar tu progreso.')
        return
      }

      if (!enrollment && !lessonData.lesson.isFreePreview) {
        const enrollResponse = await authFetch('/api/enrollments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: activeUserId, courseId: course.id }),
        })
        if (!enrollResponse.ok) {
          const body = (await enrollResponse.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error || 'Debes inscribirte al curso para guardar progreso.')
        }
        const enrollBody = (await enrollResponse.json()) as { enrollment?: EnrollmentSummary }
        if (enrollBody.enrollment) {
          setEnrollment(enrollBody.enrollment)
        }
      }

      const result = await markLessonCompleteApi(lessonData.lesson.id)
      invalidateUserEnrollmentsCache()
      setCompletedIds(new Set(result.completedLessonIds))
      setEnrollment((current) => ({
        id: result.enrollment.id,
        userId: current?.userId ?? activeUserId,
        courseId: result.courseId,
        progress: result.progress,
        completed: result.completed,
      }))
    } catch (markError) {
      if (markError instanceof Error && markError.message === 'NOT_ENROLLED') {
        setActionError('Debes inscribirte al curso para guardar progreso.')
      } else {
        setActionError(markError instanceof Error ? markError.message : 'Error al marcar completada')
      }
    } finally {
      setMarkingComplete(false)
    }
  }

  if (loading && !course) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando lección...
      </div>
    )
  }

  if (missing && !course) return <LessonNotFound />

  if ((error || !course || !lessonData) && !refreshing) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center px-6">
        <GlassCard className="max-w-md p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold">No pudimos cargar la lección</h1>
          <p className="mb-6 text-sm text-muted-foreground">{error || 'Error desconocido'}</p>
          <Link href={`/academia/${courseSlug}`}>
            <CTAButton>Volver al curso</CTAButton>
          </Link>
        </GlassCard>
      </div>
    )
  }

  if (!course || !lessonData) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando lección...
      </div>
    )
  }

  const { lesson, access } = lessonData
  const isEnrolled = Boolean(enrollment) || access.enrolled
  const contentHtml = lesson.contentMDX ? renderMarkdown(lesson.contentMDX) : ''
  const nextLesson = getNextLesson(course, lessonSlug)

  const handleSignInAndEnroll = async () => {
    const signed = await signIn()
    if (!signed) return
    await handleEnroll()
  }

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 flex flex-wrap items-center gap-4"
          >
            <Link href={`/academia/${courseSlug}`}>
              <CTAButton variant="secondary" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {course.title}
              </CTAButton>
            </Link>
            {enrollment && (
              <div className="min-w-[200px] max-w-xs flex-1">
                <CourseProgressBar
                  progress={enrollment.progress}
                  completed={enrollment.completed}
                  label="Progreso"
                  compact
                />
              </div>
            )}
            {refreshing && (
              <Loader2 className="h-4 w-4 animate-spin text-mauve-400" aria-label="Actualizando lección" />
            )}
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2.5fr)]">
            <aside>
              <GlassCard className="overflow-hidden lg:sticky lg:top-24">
                <div className="border-b border-white/10 px-5 py-4">
                  <p className="text-xs font-medium uppercase text-mauve-400">Contenido</p>
                  <h2 className="mt-1 text-lg font-semibold">{course.title}</h2>
                </div>
                <div className="max-h-[70vh] overflow-y-auto">
                  {course.modules.map((module, moduleIndex) => (
                    <div key={module.id} className="border-b border-white/10 last:border-b-0">
                      <p className="px-5 py-3 text-xs font-medium uppercase text-muted-foreground">
                        Módulo {moduleIndex + 1}: {module.title}
                      </p>
                      <div className="divide-y divide-white/5">
                        {module.lessons.map((item) => {
                          const active = item.slug === lessonSlug
                          const done = completedIds.has(item.id)
                          const locked = !item.isFreePreview && !isEnrolled

                          return (
                            <Link
                              key={item.id}
                              href={`/academia/${courseSlug}/leccion/${item.slug}`}
                              className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                                active
                                  ? 'bg-mauve-500/15 text-mauve-200'
                                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {done ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                              ) : locked ? (
                                <Lock className="h-4 w-4 shrink-0 opacity-60" />
                              ) : (
                                <Circle className="h-4 w-4 shrink-0 opacity-50" />
                              )}
                              <span className="min-w-0 truncate">{item.title}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </aside>

            <main className="space-y-6">
              <GlassCard className="p-6 sm:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {lesson.isFreePreview && (
                    <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs text-green-300">
                      Vista previa
                    </span>
                  )}
                  {lesson.duration != null && (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-muted-foreground">
                      {lesson.duration} min
                    </span>
                  )}
                </div>

                <GradientText as="h1" className="mb-3 text-3xl font-bold">
                  {lesson.title}
                </GradientText>
                {lesson.summary && (
                  <p className="mb-6 text-muted-foreground">{lesson.summary}</p>
                )}

                {!access.allowed ? (
                  <LockedLessonPanel
                    courseSlug={courseSlug}
                    onEnroll={handleEnroll}
                    enrolling={enrolling}
                  />
                ) : (
                  <>
                    {lesson.videoUrl && <VideoEmbed url={lesson.videoUrl} />}
                    {lesson.pdfResources && lesson.pdfResources.length > 0 && (
                      <PdfResourcesPanel lessonId={lesson.id} resources={lesson.pdfResources} />
                    )}
                    {contentHtml ? (
                      <div
                        className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-muted-foreground prose-a:text-mauve-300"
                        dangerouslySetInnerHTML={{ __html: contentHtml }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Esta lección aún no tiene contenido escrito.
                      </p>
                    )}

                    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
                      <CTAButton
                        onClick={() => void handleMarkComplete()}
                        disabled={markingComplete || isLessonComplete}
                        className="gap-2"
                        variant={isLessonComplete ? 'secondary' : 'primary'}
                      >
                        {markingComplete ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {isLessonComplete ? 'Lección completada' : 'Marcar como completada'}
                      </CTAButton>

                      {nextLesson ? (
                        <Link href={`/academia/${courseSlug}/leccion/${nextLesson.slug}`}>
                          <CTAButton variant={isLessonComplete ? 'primary' : 'secondary'} className="gap-2">
                            Siguiente lección
                            <ArrowRight className="h-4 w-4" />
                          </CTAButton>
                        </Link>
                      ) : isLessonComplete && enrollment?.completed ? (
                        <Link href={`/academia/${courseSlug}`}>
                          <CTAButton variant="primary" className="gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Curso completado
                          </CTAButton>
                        </Link>
                      ) : null}
                    </div>
                  </>
                )}

                {(actionError || signError) && (
                  <p className="mt-4 text-sm text-red-300">{actionError || signError}</p>
                )}

                {!authenticated && ready && sessionState === 'no_wallet' && access.requiresEnrollment && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    <button type="button" onClick={() => void login()} className="text-mauve-300 underline">
                      Inicia sesión
                    </button>{' '}
                    para inscribirte y acceder al contenido completo.
                  </p>
                )}

                {sessionState === 'needs_signature' && (
                  <div className="mt-4">
                    <CTAButton
                      size="sm"
                      onClick={() => void handleSignInAndEnroll()}
                      disabled={signing || enrolling}
                      className="gap-2"
                    >
                      {(signing || enrolling) && <Loader2 className="h-4 w-4 animate-spin" />}
                      Firmar para continuar
                    </CTAButton>
                  </div>
                )}
              </GlassCard>
            </main>
          </div>
        </div>
      </Section>
    </div>
  )
}
