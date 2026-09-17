'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  CheckCircle2,
  Circle,
  GraduationCap,
  Layers3,
  Play,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import { CourseProgressBar } from '@/components/academy/CourseProgressBar'
import { GlassCard } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
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

type ProductStatus = 'pendiente' | 'en curso' | 'completado'
type ProductCardVariant = 'course' | 'program' | 'supervision'

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

function productStatus(enrollment: EnrollmentSummary | undefined): ProductStatus {
  if (enrollment?.completed) return 'completado'
  if (enrollment && enrollment.progress > 0) return 'en curso'
  return 'pendiente'
}

function statusClass(status: ProductStatus) {
  if (status === 'completado') return 'border-green-400/30 bg-green-600/90 text-white'
  if (status === 'en curso') return 'border-mauve-400/30 bg-mauve-600/90 text-white'
  return 'border-white/15 bg-black/50 text-white/90'
}

function usePraxisCatalogState() {
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

  return { coursesBySlug, enrollmentsByCourseId }
}

function ProductCard({
  product,
  course,
  enrollment,
  displayCurrency,
  usdToMxn,
  variant = 'course',
  recommended = false,
  recommendedLabel = 'Empieza aquí',
}: {
  product: PraxisProduct
  course?: PublicCourse
  enrollment?: EnrollmentSummary
  displayCurrency: CourseCurrency
  usdToMxn: number | null
  variant?: ProductCardVariant
  recommended?: boolean
  recommendedLabel?: string
}) {
  const href =
    product.type === 'supervision'
      ? '/academia/03-praxis/leccion/supervision-clinica-cuando-tiene-sentido'
      : `/academia/${product.slug}`
  const Icon = product.type === 'supervision' ? Stethoscope : product.type === 'program' ? GraduationCap : BookOpen
  const status = productStatus(enrollment)
  const completed = status === 'completado'
  const price = formatProductPrice(product, course, displayCurrency, usdToMxn)
  const ctaLabel = product.type === 'supervision' ? 'Ver oferta' : completed ? 'Reabrir' : 'Ver formación'

  if (variant === 'supervision') {
    return (
      <Link href={href} className="block" id={`producto-${product.slug}`}>
        <GlassCard hover className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <Stethoscope className="h-5 w-5 text-mauve-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-mauve-400">Oferta aparte</p>
            <h3 className="mt-0.5 text-base font-semibold">{product.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">{product.summary}</p>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
            <span className="font-semibold text-mauve-300">{price}</span>
            <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium">{ctaLabel}</span>
          </div>
        </GlassCard>
      </Link>
    )
  }

  const isProgram = variant === 'program'

  return (
    <Link href={href} className="block h-full" id={`producto-${product.slug}`}>
      <GlassCard
        hover={!completed}
        className={cn(
          'flex h-full overflow-hidden',
          isProgram ? 'flex-col lg:flex-row' : 'flex-col',
          completed && 'border-green-500/20 bg-white/[0.03] opacity-80',
          recommended && !completed && 'ring-1 ring-mauve-400/45',
        )}
      >
        <div
          role="img"
          aria-label={product.title}
          className={cn(
            'relative flex items-center justify-center bg-gradient-to-br from-mauve-500/25 to-iris-500/20 bg-cover bg-center',
            isProgram ? 'aspect-[16/9] lg:aspect-auto lg:min-h-[220px] lg:w-[42%]' : 'aspect-[16/9]',
            completed && 'grayscale-[0.35]',
          )}
          style={course?.imageUrl ? { backgroundImage: `url(${course.imageUrl})` } : undefined}
        >
          {!course?.imageUrl && (
            <div className={cn('flex items-center justify-center rounded-lg bg-mauve-500/80', isProgram ? 'h-16 w-16' : 'h-14 w-14')}>
              {isProgram ? <GraduationCap className="h-8 w-8 text-white" /> : <Play className="h-7 w-7 text-white" />}
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize shadow-lg', statusClass(status))}>
              {status === 'completado' && <CheckCircle2 className="mr-1 inline h-3 w-3" />}
              {status}
              {status === 'en curso' && enrollment?.progress ? ` · ${enrollment.progress}%` : ''}
            </span>
            {recommended && !completed && (
              <span className="rounded-full border border-mauve-300/40 bg-mauve-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
                {recommendedLabel}
              </span>
            )}
          </div>
        </div>

        <div className={cn('flex flex-1 flex-col', isProgram ? 'p-5 sm:p-6 lg:p-7' : 'p-4 sm:p-5')}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-mauve-500/20 px-3 py-1 text-xs font-medium text-mauve-300">
              {productTypeLabel(product.type)}
            </span>
            {isProgram && (
              <span className="rounded-full bg-iris-500/15 px-3 py-1 text-xs font-medium text-iris-200">5/5</span>
            )}
          </div>
          <div className="mb-2 flex items-start gap-2">
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', completed ? 'text-green-300' : 'text-mauve-300')} />
            <h3
              className={cn(
                'font-semibold leading-snug',
                isProgram ? 'text-lg sm:text-xl' : 'text-base sm:text-lg',
                completed && 'text-muted-foreground line-through decoration-white/30',
              )}
            >
              {product.title}
            </h3>
          </div>
          {product.author && (
            <p className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" />
              {product.author}
            </p>
          )}
          <p className={cn('mb-4 text-sm leading-relaxed text-muted-foreground', isProgram ? 'line-clamp-3 flex-1' : 'line-clamp-2 flex-1')}>
            {product.summary}
          </p>
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <span className="font-semibold text-mauve-300">{price}</span>
            <span className="rounded-lg bg-mauve-500 px-3 py-1.5 text-xs font-medium text-white">{ctaLabel}</span>
          </div>
        </div>
      </GlassCard>
    </Link>
  )
}

function CollectionProgressTrack({
  products,
  coursesBySlug,
  enrollmentsByCourseId,
  completedCount,
  total,
}: {
  products: PraxisProduct[]
  coursesBySlug: Map<string, PublicCourse>
  enrollmentsByCourseId: Map<string, EnrollmentSummary>
  completedCount: number
  total: number
}) {
  const allComplete = total > 0 && completedCount === total

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-mauve-400">Tu progreso en la colección actual</p>
          <h3 className="mt-1 text-lg font-semibold sm:text-xl">{PRAXIS_COLLECTION_BENJAMIN}</h3>
        </div>
        <p className="text-sm font-semibold tabular-nums text-mauve-300">
          {completedCount}/{total}
          <span className="mx-1.5 text-muted-foreground">→</span>
          {total}/{total}
        </p>
      </div>
      <CourseProgressBar
        progress={total > 0 ? Math.round((completedCount / total) * 100) : 0}
        completed={allComplete}
        label="Progreso de la colección"
        valueLabel={`${completedCount}/${total}`}
        completeMessage={false}
      />
      <ol className="grid grid-cols-5 gap-2">
        {products.map((product, index) => {
          const course = coursesBySlug.get(product.slug)
          const status = productStatus(course ? enrollmentsByCourseId.get(course.id) : undefined)
          const done = status === 'completado'
          return (
            <li key={product.slug}>
              <a
                href={`#producto-${product.slug}`}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-center transition hover:bg-white/5',
                  done ? 'text-green-300' : status === 'en curso' ? 'text-mauve-200' : 'text-muted-foreground',
                )}
              >
                {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className={cn('h-5 w-5', status === 'en curso' && 'fill-mauve-500/40')} />}
                <span className="text-[11px] font-semibold tabular-nums">{index + 1}/5</span>
                <span className="hidden line-clamp-2 text-[11px] leading-tight sm:block">{product.title}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function CollectionCatalogGrid({
  products,
  coursesBySlug,
  enrollmentsByCourseId,
  displayCurrency,
  usdToMxn,
}: {
  products: PraxisProduct[]
  coursesBySlug: Map<string, PublicCourse>
  enrollmentsByCourseId: Map<string, EnrollmentSummary>
  displayCurrency: CourseCurrency
  usdToMxn: number | null
}) {
  const courses = products.filter((product) => product.type === 'course')
  const program = products.find((product) => product.type === 'program')
  const nextProduct = products.find((product) => {
    const course = coursesBySlug.get(product.slug)
    return productStatus(course ? enrollmentsByCourseId.get(course.id) : undefined) !== 'completado'
  })
  const nextSlug = nextProduct?.slug
  const hasStarted = products.some((product) => {
    const course = coursesBySlug.get(product.slug)
    return productStatus(course ? enrollmentsByCourseId.get(course.id) : undefined) === 'completado'
  })
  const recommendedLabel = hasStarted ? 'Siguiente' : 'Empieza aquí'

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:gap-6">
        {courses.map((product) => {
          const course = coursesBySlug.get(product.slug)
          return (
            <ProductCard
              key={product.slug}
              product={product}
              course={course}
              enrollment={course ? enrollmentsByCourseId.get(course.id) : undefined}
              displayCurrency={displayCurrency}
              usdToMxn={usdToMxn}
              recommended={product.slug === nextSlug}
              recommendedLabel={recommendedLabel}
            />
          )
        })}
      </div>
      {program && (
        <ProductCard
          product={program}
          course={coursesBySlug.get(program.slug)}
          enrollment={
            coursesBySlug.get(program.slug)
              ? enrollmentsByCourseId.get(coursesBySlug.get(program.slug)!.id)
              : undefined
          }
          displayCurrency={displayCurrency}
          usdToMxn={usdToMxn}
          variant="program"
          recommended={program.slug === nextSlug}
          recommendedLabel={recommendedLabel}
        />
      )}
    </div>
  )
}

export function PraxisCollectionProgress({
  displayCurrency = 'USD',
  usdToMxn = null,
}: {
  displayCurrency?: CourseCurrency
  usdToMxn?: number | null
}) {
  const { coursesBySlug, enrollmentsByCourseId } = usePraxisCatalogState()
  const products = praxisProductsByCollection(PRAXIS_COLLECTION_BENJAMIN)
  const completedCount = products.filter((product) => {
    const course = coursesBySlug.get(product.slug)
    if (!course) return false
    return enrollmentsByCourseId.get(course.id)?.completed === true
  }).length
  const total = products.length
  const allComplete = total > 0 && completedCount === total

  return (
    <section className="space-y-5" id="progreso-coleccion">
      <CollectionProgressTrack
        products={products}
        coursesBySlug={coursesBySlug}
        enrollmentsByCourseId={enrollmentsByCourseId}
        completedCount={completedCount}
        total={total}
      />
      <CollectionCatalogGrid
        products={products}
        coursesBySlug={coursesBySlug}
        enrollmentsByCourseId={enrollmentsByCourseId}
        displayCurrency={displayCurrency}
        usdToMxn={usdToMxn}
      />
      <p className="text-sm font-medium text-mauve-200">
        {isAcademyComplimentaryPreview()
          ? `Acceso de revisión sin pago. Precio real de la colección: USD ${benjaminCollectionTotalUsd()}.`
          : `Colección completa: USD ${benjaminCollectionTotalUsd()} en compras individuales.`}
      </p>
      {allComplete ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{PRAXIS_COLLECTION_FIVE_OF_FIVE}</p>
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
  const { coursesBySlug, enrollmentsByCourseId } = usePraxisCatalogState()
  const products = praxisProductsByCollection(PRAXIS_COLLECTION_BENJAMIN)
  const completedCount = products.filter((product) => {
    const course = coursesBySlug.get(product.slug)
    if (!course) return false
    return enrollmentsByCourseId.get(course.id)?.completed === true
  }).length
  const total = products.length
  const allComplete = total > 0 && completedCount === total

  const collections = useMemo(() => {
    const named = new Map<string, PraxisProduct[]>()
    for (const name of PRAXIS_COLLECTION_ORDER) named.set(name, [])
    for (const product of PRAXIS_PRODUCTS) {
      if (!product.collection) continue
      const list = named.get(product.collection) ?? []
      list.push(product)
      named.set(product.collection, list)
    }
    return [...named.entries()].filter(([, list]) => list.length > 0)
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

  if (currentSlug) {
    return (
      <section id="catalogo" className="space-y-6">
        {collections.map(([collectionName, collectionProducts]) => (
          <div key={collectionName} className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-mauve-400">Colección destacada</p>
              <h3 className="mt-1 text-lg font-semibold sm:text-xl">{collectionName}</h3>
            </div>
            <CollectionCatalogGrid
              products={collectionProducts}
              coursesBySlug={coursesBySlug}
              enrollmentsByCourseId={enrollmentsByCourseId}
              displayCurrency={displayCurrency}
              usdToMxn={usdToMxn}
            />
          </div>
        ))}
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
      </section>
    )
  }

  return (
    <section id="catalogo" className="scroll-mt-24 space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-mauve-400">Catálogo de Praxis</p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Elige formación</h2>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Praxis reúne cursos breves, talleres, programas de autor, ejercicios, casos educativos y espacios de
          aprendizaje entre colegas. No necesitas recorrer todo el catálogo ni seguir una sola escuela clínica. Puedes
          empezar por la habilidad que hoy te resulte más útil y continuar cuando tenga sentido para ti.
        </p>
      </div>

      <CollectionProgressTrack
        products={products}
        coursesBySlug={coursesBySlug}
        enrollmentsByCourseId={enrollmentsByCourseId}
        completedCount={completedCount}
        total={total}
      />

      <CollectionCatalogGrid
        products={products}
        coursesBySlug={coursesBySlug}
        enrollmentsByCourseId={enrollmentsByCourseId}
        displayCurrency={displayCurrency}
        usdToMxn={usdToMxn}
      />

      <p className="text-sm font-medium text-mauve-200">
        {isAcademyComplimentaryPreview()
          ? `Acceso de revisión sin pago. Precio real de la colección: USD ${benjaminCollectionTotalUsd()}.`
          : `Colección completa: USD ${benjaminCollectionTotalUsd()} en compras individuales.`}
      </p>
      {!allComplete && <p className="text-sm font-medium">{PRAXIS_COLLECTION_NEXT_GOAL}</p>}

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Layers3 className="h-4 w-4 text-mauve-300" />
          <h3 className="font-semibold text-foreground">Supervisión clínica</h3>
        </div>
        <ProductCard product={supervision} displayCurrency={displayCurrency} usdToMxn={usdToMxn} variant="supervision" />
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{PRAXIS_PROFESSIONAL_NOTE}</p>

      <GlassCard className={cn('p-5 sm:p-6', allComplete && 'border-green-500/20')}>
        <p className="text-xs font-medium uppercase tracking-wide text-mauve-400">Siguiente etapa</p>
        <h3 className="mt-1 text-lg font-semibold sm:text-xl">04 — Validación</h3>
        {allComplete && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{PRAXIS_COLLECTION_FIVE_OF_FIVE}</p>
        )}
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{PRAXIS_COLLECTION_FIVE_OF_FIVE_DISCLAIMER}</p>
        <Link href="/academia/04-validacion" className="mt-4 inline-block">
          <CTAButton>Ir a 04 — Validación</CTAButton>
        </Link>
      </GlassCard>
    </section>
  )
}
