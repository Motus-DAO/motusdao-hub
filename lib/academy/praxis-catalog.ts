import type { PdfResource } from '@/lib/academy/media'
import { ROUTE_BLOCK_SLUG_ORDER } from '@/lib/academy/route-blocks'

export type PraxisProductType = 'course' | 'workshop' | 'program' | 'supervision'
export type PraxisProductStatus = 'live' | 'coming-soon'

export type PraxisProduct = {
  slug: string
  courseId?: string
  title: string
  type: PraxisProductType
  author?: string
  collection?: string
  priceUsd: number
  priceSuffix?: string
  status: PraxisProductStatus
  summary: string
  sourceFile: string
}

export type PraxisLegacyMedia = {
  lessonSlug: string
  videoUrl?: string
  pdfResources?: PdfResource[]
}

export const PRAXIS_BLOCK_SLUG = '03-praxis'
export const PRAXIS_BLOCK_ID = 'course_praxis'
export const PRAXIS_COLLECTION_BENJAMIN = 'Maestro Benjamin Buzali'
export const PRAXIS_CATEGORY = 'Praxis'

export const PRAXIS_PROFESSIONAL_NOTE =
  'La formación de MotusDAO es educación continua. No sustituye formación universitaria, licencia o cédula profesional, supervisión clínica ni las obligaciones éticas y legales aplicables a cada profesional.'

/** Featured catalog copy from 00-bloque-03-praxis.md — do not rewrite. */
export const PRAXIS_PRODUCTS: PraxisProduct[] = [
  {
    slug: 'escucha-clinica-patrones',
    courseId: 'course_praxis_escucha_clinica',
    title: 'Escucha clínica y patrones relacionales',
    type: 'course',
    author: 'Maestro Benjamin Buzali',
    collection: PRAXIS_COLLECTION_BENJAMIN,
    priceUsd: 15,
    status: 'live',
    summary:
      'Aprende a observar contenido, interacción, repeticiones y patrones sin confundir una primera interpretación con un hecho.',
    sourceFile: '01-curso-escucha-clinica-y-patrones.md',
  },
  {
    slug: 'formulacion-casos-hipotesis',
    courseId: 'course_praxis_formulacion_casos',
    title: 'Formulación de casos e hipótesis clínicas',
    type: 'course',
    author: 'Maestro Benjamin Buzali',
    collection: PRAXIS_COLLECTION_BENJAMIN,
    priceUsd: 15,
    status: 'live',
    summary:
      'Organiza información dispersa y conviértela en hipótesis provisionales que puedas contrastar, revisar y llevar a discusión o supervisión.',
    sourceFile: '02-curso-formulacion-casos.md',
  },
  {
    slug: 'razonamiento-clinico-discurso',
    courseId: 'course_praxis_razonamiento',
    title: 'Razonamiento clínico y análisis del discurso',
    type: 'course',
    author: 'Maestro Benjamin Buzali',
    collection: PRAXIS_COLLECTION_BENJAMIN,
    priceUsd: 15,
    status: 'live',
    summary:
      'Practica cómo identificar absolutos, contradicciones, excepciones, omisiones y relaciones entre afirmaciones.',
    sourceFile: '03-curso-razonamiento-y-discurso.md',
  },
  {
    slug: 'etica-intervencion-conversacion',
    courseId: 'course_praxis_etica',
    title: 'Ética de la intervención y conversación clínica',
    type: 'course',
    author: 'Maestro Benjamin Buzali',
    collection: PRAXIS_COLLECTION_BENJAMIN,
    priceUsd: 15,
    status: 'live',
    summary:
      'Analiza qué haces con tus palabras, qué efecto puede tener una intervención y qué alternativas existen antes de cerrar una explicación.',
    sourceFile: '04-curso-etica-intervencion.md',
  },
  {
    slug: 'programa-avanzado-logica-discurso-clinica',
    courseId: 'course_praxis_avanzado_benjamin',
    title: 'Programa avanzado de lógica, discurso y clínica lacaniana',
    type: 'program',
    author: 'Maestro Benjamin Buzali',
    collection: PRAXIS_COLLECTION_BENJAMIN,
    priceUsd: 40,
    status: 'live',
    summary:
      'Profundiza en lógica formal, argumentación, Lacan y el modelo lógico-clínico desarrollado por Maestro Benjamin Buzali.',
    sourceFile: '05-programa-avanzado-benjamin.md',
  },
  {
    slug: 'supervision-clinica',
    title: 'Supervisión clínica',
    type: 'supervision',
    priceUsd: 50,
    priceSuffix: '/sesión',
    status: 'live',
    summary:
      'Oferta distinta de los cursos y talleres. Revisión de preguntas ligadas a la práctica, dentro de un encuadre específico. No es requisito para completar Praxis ni equivale a Validación o acceso al Portal.',
    sourceFile: '00-bloque-03-praxis.md',
  },
]

export const PRAXIS_CATALOG_COURSE_SLUGS = PRAXIS_PRODUCTS.filter((product) => product.courseId).map(
  (product) => product.slug,
)

export const LEGACY_CURSO_ONLINE_SLUGS = ['curso-online'] as const

export function isHiddenLegacyAcademySlug(slug: string): boolean {
  return (LEGACY_CURSO_ONLINE_SLUGS as readonly string[]).includes(slug)
}

export const PRAXIS_COLLECTION_ORDER = [PRAXIS_COLLECTION_BENJAMIN] as const

const CUADRANTE_LOGICO_PDF: PdfResource = {
  id: 'pdf_praxis_cuadrante_logico',
  name: 'Cuadrante Lógico / cuadro de oposición',
  storagePath:
    'cmsh1j2cgd50cbd39cb4aeeb3/cmsigan6n8f9629947cb27b36/pdfs/cmsigaob88f96e012ebf62aad.pdf',
  uploadedAt: '2026-08-07T00:00:00.000Z',
}

/**
 * Legacy YouTube / PDF mapping from `curso-online` snapshot.
 * Modal logic video (necesario → posible → contingente → imposible) is NOT attached to Curso 4.
 */
export const PRAXIS_LEGACY_MEDIA_BY_SLUG: Record<string, PraxisLegacyMedia[]> = {
  'escucha-clinica-patrones': [
    {
      lessonSlug: 'la-relacion-terapeutica-como-informacion',
      videoUrl: 'https://www.youtube.com/watch?v=zc8p6K7gMU8',
    },
  ],
  'formulacion-casos-hipotesis': [
    {
      lessonSlug: 'observacion-interpretacion-e-hipotesis',
      videoUrl: 'https://www.youtube.com/watch?v=p49BmczfSSQ',
    },
  ],
  'razonamiento-clinico-discurso': [
    {
      lessonSlug: 'cuatro-formas-categoricas',
      videoUrl: 'https://www.youtube.com/watch?v=7xWHOiBVhiI',
      pdfResources: [CUADRANTE_LOGICO_PDF],
    },
  ],
  'etica-intervencion-conversacion': [
    {
      lessonSlug: 'la-perra-que-se-escapo',
      videoUrl: 'https://www.youtube.com/watch?v=r15r1gIozyU',
    },
  ],
  'programa-avanzado-logica-discurso-clinica': [
    {
      lessonSlug: 'modalidad-y-sintoma',
      videoUrl: 'https://www.youtube.com/watch?v=TXBTIO-g-0E',
    },
  ],
}

export function isRouteBlockSlug(slug: string): boolean {
  return (ROUTE_BLOCK_SLUG_ORDER as readonly string[]).includes(slug)
}

export function isPraxisCatalogSlug(slug: string): boolean {
  return PRAXIS_CATALOG_COURSE_SLUGS.includes(slug)
}

export function findPraxisProductBySlug(slug: string): PraxisProduct | undefined {
  return PRAXIS_PRODUCTS.find((product) => product.slug === slug)
}

export function praxisProductsByCollection(collection: string): PraxisProduct[] {
  return PRAXIS_PRODUCTS.filter((product) => product.collection === collection)
}

export function praxisSupervisionProduct(): PraxisProduct {
  const product = PRAXIS_PRODUCTS.find((item) => item.type === 'supervision')
  if (!product) throw new Error('Praxis supervision product is missing from catalog')
  return product
}

export function benjaminCollectionTotalUsd(): number {
  return praxisProductsByCollection(PRAXIS_COLLECTION_BENJAMIN).reduce(
    (total, product) => total + product.priceUsd,
    0,
  )
}

export const PRAXIS_COLLECTION_NEXT_GOAL =
  'Completa el siguiente producto de tu colección y lleva tu progreso a 5/5.'

export const PRAXIS_COLLECTION_FIVE_OF_FIVE =
  'Cuando llegues a 5/5, tendrás el recorrido formativo completo de la colección actual de Praxis y podrás entrar al siguiente bloque con una trayectoria educativa más completa para documentar.'

export const PRAXIS_COLLECTION_FIVE_OF_FIVE_DISCLAIMER =
  'Esto no equivale a licencia, certificación oficial, aprobación clínica ni acceso automático al Portal. La siguiente etapa, 04 — Validación, revisa criterios y documentación por separado.'

export function productTypeLabel(type: PraxisProductType): string {
  switch (type) {
    case 'course':
      return 'Curso'
    case 'workshop':
      return 'Taller'
    case 'program':
      return 'Programa'
    case 'supervision':
      return 'Supervisión'
    default:
      return type
  }
}
