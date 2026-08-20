'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, CheckCircle2, GraduationCap, Layers3, Play, Stethoscope, UserRound } from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { CourseProgressBar } from '@/components/academy/CourseProgressBar'
import { GlassCard } from '@/components/ui/GlassCard'
import {
  PRAXIS_COLLECTION_BENJAMIN,
  PRAXIS_COLLECTION_FIVE_OF_FIVE,
  PRAXIS_COLLECTION_FIVE_OF_FIVE_DISCLAIMER,
  PRAXIS_COLLECTION_NEXT_GOAL,
  PRAXIS_COLLECTION_ORDER,
  PRAXIS_PROFESSIONAL_NOTE,
  PRAXIS_PRODUCTS,
  benjaminCollectionTotalUsd,
  findPraxisProductBySlug,
  productTypeLabel,
  praxisProductsByCollection,
  praxisSupervisionProduct,
  type PraxisProduct,
} from '@/lib/academy/praxis-catalog'
import { isAcademyComplimentaryPreview } from '@/lib/academy/complimentary-preview'
import { formatCoursePriceInCurrency, type CourseCurrency } from '@/lib/academy/course-pricing'
import {
  fetchPublishedCourses,
  fetchUserEnrollments,
  type EnrollmentSummary,
  type PublicCourse,
} from '@/lib/academy/public-course'
import { fetchAppSession } from '@/lib/auth/client'

function formatProductPrice(
  product: PraxisProduct,
  course: PublicCourse | undefined,
  displayCurrency: CourseCurrency,
  usdToMxn: number | null,
): string {
  if (isAcademyComplimentaryPreview() && product.type !== 'supervision') return 'Gratis'
  if (course) return formatCoursePriceInCurrency(course, displayCurrency, usdToMxn)
  return `US$${product.priceUsd.toFixed(0)} USD${product.priceSuffix ?? ''}`
}

function productStatus(
  enrollment: EnrollmentSummary | undefined,
): 'pendiente' | 'en progreso' | 'completado' {
  if (enrollment?.completed) return 'completado'
  if (enrollment && enrollment.progress > 0) return 'en progreso'
  return 'pendiente'
}

function ProductCard({
  product,
  course,
  enrollment,
  displayCurrency,
  usdToMxn,
  showProgress = false,
}: {
  product: PraxisProduct
  course?: PublicCourse
  enrollment?: EnrollmentSummary
  displayCurrency: CourseCurrency
  usdToMxn: number | null
  showProgress?: boolean
}) {
  const href =
    product.type === 'supervision'
      ? '/academia/03-praxis/leccion/supervision-clinica-cuando-tiene-sentido'
      : `/academia/${product.slug}`
  const Icon = product.type === 'supervision' ? Stethoscope : product.type === 'program' ? GraduationCap : BookOpen
  const status = productStatus(enrollment)
  const completed = status === 'completado'

  return (
    <Link href={href} className="block h-full">
      <GlassCard
        hover
        className={`flex h-full flex-col overflow-hidden ${completed ? 'border-green-500/25 bg-green-500/5' : ''}`}
      >
        <div
          role="img"
          aria-label={product.title}
          className={`relative flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-mauve-500/20 to-iris-500/20 bg-cover bg-center ${
            completed ? 'opacity-80' : ''
          }`}
          style={course?.imageUrl ? { backgroundImage: `url(${course.imageUrl})` } : undefined}
        >
          {completed && (
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-green-400/30 bg-green-600/90 px-3 py-1 text-xs font-semibold text-white shadow-lg">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completado
            </div>
          )}
          {showProgress && status === 'en progreso' && (
            <div className="absolute right-3 top-3 rounded-full border border-mauve-400/30 bg-mauve-600/90 px-3 py-1 text-xs font-semibold text-white shadow-lg">
              En progreso · {enrollment?.progress}%
            </div>
          )}
          {!course?.imageUrl && (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-mauve-500/80">
              <Play className="h-7 w-7 text-white" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-mauve-500/20 px-3 py-1 text-xs font-medium text-mauve-300">
              {productTypeLabel(product.type)}
            </span>
            {product.author && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-muted-foreground">
                <UserRound className="h-3 w-3" />
                {product.author}
              </span>
            )}
          </div>
          <div className="mb-2 flex items-start gap-2">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${completed ? 'text-green-300' : 'text-mauve-300'}`} />
            <h3
              className={`text-base font-semibold leading-snug sm:text-lg ${
                completed ? 'text-muted-foreground line-through decoration-white/30' : ''
              }`}
            >
              {product.title}
            </h3>
          </div>
          <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">{product.summary}</p>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <span className="font-semibold text-mauve-300">
              {formatProductPrice(product, course, displayCurrency, usdToMxn)}
            </span>
            <span className="rounded-lg bg-mauve-500 px-3 py-1.5 text-xs font-medium text-white">
              {product.type === 'supervision' ? 'Ver oferta' : completed ? 'Reabrir' : 'Ver formación'}
            </span>
          </div>
        </div>
      </GlassCard>
    </Link>
  )
}

export function PraxisCollectionProgress({
  displayCurrency = 'USD',
  usdToMxn = null,
}: {
  displayCurrency?: CourseCurrency
  usdToMxn?: number | null
}) {
  const [courses, setCourses] = useState<PublicCourse[]>([])
  const [enrollmentsByCourseId, setEnrollmentsByCourseId] = useState<Map<string, EnrollmentSummary>>(
    () => new Map(),
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchPublishedCourses(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCourses(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setCourses([])
      })

    void fetchAppSession()
      .then((session) => {
        if (!session.userId) return []
        return fetchUserEnrollments(session.userId, controller.signal, { force: true })
      })
      .then((enrollments) => {
        if (controller.signal.aborted || !enrollments) return
        const next = new Map<string, EnrollmentSummary>()
        for (const enrollment of enrollments) next.set(enrollment.courseId, enrollment)
        setEnrollmentsByCourseId(next)
      })
      .catch(() => {
        if (!controller.signal.aborted) setEnrollmentsByCourseId(new Map())
      })

    return () => controller.abort()
  }, [])

  const products = praxisProductsByCollection(PRAXIS_COLLECTION_BENJAMIN)
  const coursesBySlug = useMemo(() => {
    const map = new Map<string, PublicCourse>()
    for (const course of courses) map.set(course.slug, course)
    return map
  }, [courses])

  const completedCount = products.filter((product) => {
    const course = coursesBySlug.get(product.slug)
    if (!course) return false
    return enrollmentsByCourseId.get(course.id)?.completed === true
  }).length
  const total = products.length
  const allComplete = total > 0 && completedCount === total

  return (
    <section className="space-y-4" id="progreso-coleccion">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-mauve-400">Tu progreso en la colección actual</p>
          <h3 className="mt-1 text-lg font-semibold sm:text-xl">{PRAXIS_COLLECTION_BENJAMIN}</h3>
        </div>
        <p className="text-sm font-semibold text-mauve-300">
          {completedCount}/{total}
        </p>
      </div>
      <CourseProgressBar
        progress={total > 0 ? Math.round((completedCount / total) * 100) : 0}
        completed={allComplete}
        label="Progreso de la colección"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {products.map((product) => {
          const course = coursesBySlug.get(product.slug)
          return (
            <ProductCard
              key={product.slug}
              product={product}
              course={course}
              enrollment={course ? enrollmentsByCourseId.get(course.id) : undefined}
              displayCurrency={displayCurrency}
              usdToMxn={usdToMxn}
              showProgress
            />
          )
        })}
      </div>
      <p className="text-sm font-medium text-mauve-200">
        {isAcademyComplimentaryPreview()
          ? `Acceso de revisión sin pago. Precio real de la colección: USD ${benjaminCollectionTotalUsd()}.`
          : `Colección completa: USD ${benjaminCollectionTotalUsd()} en compras individuales.`}
      </p>
      {allComplete ? (
        <GlassCard className="border-green-500/20 p-4 sm:p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{PRAXIS_COLLECTION_FIVE_OF_FIVE}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {PRAXIS_COLLECTION_FIVE_OF_FIVE_DISCLAIMER}
          </p>
          <Link href="/academia/04-validacion" className="mt-4 inline-block">
            <CTAButton>Ir a 04 — Validación</CTAButton>
          </Link>
        </GlassCard>
      ) : (
        <p className="text-sm font-medium">{PRAXIS_COLLECTION_NEXT_GOAL}</p>
      )}
    </section>
  )
}

export function PraxisCatalog({
  displayCurrency = 'USD',
  usdToMxn = null,
  currentSlug,
}: {
  displayCurrency?: CourseCurrency
  usdToMxn?: number | null
  currentSlug?: string
}) {
  const [courses, setCourses] = useState<PublicCourse[]>([])
  const [enrollmentsByCourseId, setEnrollmentsByCourseId] = useState<Map<string, EnrollmentSummary>>(
    () => new Map(),
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchPublishedCourses(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCourses(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setCourses([])
      })

    void fetchAppSession()
      .then((session) => {
        if (!session.userId) return []
        return fetchUserEnrollments(session.userId, controller.signal, { force: true })
      })
      .then((enrollments) => {
        if (controller.signal.aborted || !enrollments) return
        const next = new Map<string, EnrollmentSummary>()
        for (const enrollment of enrollments) next.set(enrollment.courseId, enrollment)
        setEnrollmentsByCourseId(next)
      })
      .catch(() => {
        if (!controller.signal.aborted) setEnrollmentsByCourseId(new Map())
      })

    return () => controller.abort()
  }, [])

  const coursesBySlug = useMemo(() => {
    const map = new Map<string, PublicCourse>()
    for (const course of courses) map.set(course.slug, course)
    return map
  }, [courses])

  const collections = useMemo(() => {
    const named = new Map<string, PraxisProduct[]>()
    for (const name of PRAXIS_COLLECTION_ORDER) named.set(name, [])
    for (const product of PRAXIS_PRODUCTS) {
      if (!product.collection) continue
      const list = named.get(product.collection) ?? []
      list.push(product)
      named.set(product.collection, list)
    }
    return [...named.entries()].filter(([, products]) => products.length > 0)
  }, [])

  const supervision = praxisSupervisionProduct()
  const currentProduct = currentSlug ? findPraxisProductBySlug(currentSlug) : undefined
  const nextInCollection = useMemo(() => {
    if (!currentProduct?.collection) return null
    const siblings = collections.find(([name]) => name === currentProduct.collection)?.[1] ?? []
    const index = siblings.findIndex((item) => item.slug === currentProduct.slug)
    if (index < 0 || index >= siblings.length - 1) return null
    return siblings[index + 1]
  }, [collections, currentProduct])

  return (
    <section id="catalogo" className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-mauve-400">Catálogo de Praxis</p>
        <h2 className="mt-1 text-xl font-bold sm:text-2xl">Elige formación</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Praxis reúne cursos breves, talleres, programas de autor, ejercicios, casos educativos y espacios de
          aprendizaje entre colegas. No necesitas recorrer todo el catálogo ni seguir una sola escuela clínica. Puedes
          empezar por la habilidad que hoy te resulte más útil y continuar cuando tenga sentido para ti.
        </p>
      </div>

      {!currentSlug && <PraxisCollectionProgress displayCurrency={displayCurrency} usdToMxn={usdToMxn} />}

      {currentSlug &&
        collections.map(([collectionName, products]) => (
          <div key={collectionName} className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-mauve-400">Colección destacada</p>
                <h3 className="mt-1 text-lg font-semibold sm:text-xl">{collectionName}</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {products.map((product) => {
                const course = coursesBySlug.get(product.slug)
                return (
                  <ProductCard
                    key={product.slug}
                    product={product}
                    course={course}
                    enrollment={course ? enrollmentsByCourseId.get(course.id) : undefined}
                    displayCurrency={displayCurrency}
                    usdToMxn={usdToMxn}
                    showProgress
                  />
                )
              })}
            </div>
          </div>
        ))}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-mauve-300" />
          <h3 className="text-lg font-semibold">Supervisión clínica</h3>
        </div>
        <ProductCard product={supervision} displayCurrency={displayCurrency} usdToMxn={usdToMxn} />
      </div>

      {nextInCollection && (
        <GlassCard className="p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-mauve-400">Siguiente en la colección</p>
          <p className="mt-1 font-semibold">{nextInCollection.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{nextInCollection.summary}</p>
          <Link href={`/academia/${nextInCollection.slug}`} className="mt-3 inline-block">
            <CTAButton size="sm">Continuar</CTAButton>
          </Link>
        </GlassCard>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">{PRAXIS_PROFESSIONAL_NOTE}</p>

      {!currentSlug && (
        <GlassCard className="p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-mauve-400">Siguiente bloque</p>
          <h3 className="mt-1 text-lg font-semibold">04 — Validación</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {PRAXIS_COLLECTION_FIVE_OF_FIVE_DISCLAIMER}
          </p>
          <Link href="/academia/04-validacion" className="mt-4 inline-block">
            <CTAButton>Ir a 04 — Validación</CTAButton>
          </Link>
        </GlassCard>
      )}
    </section>
  )
}
