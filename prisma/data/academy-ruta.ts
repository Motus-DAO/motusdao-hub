import type { PrismaClient } from '@prisma/client'
import { seedAcademyFundamentos } from './academy-fundamentos'
import { seedAcademyGenesisWithCleanup } from './academy-genesis'
import { archiveLegacyCursoOnline, buildPraxisCatalogCourses } from './academy-praxis'
import { seedAcademyRouteBlocks } from './academy-route-blocks'
import { upsertAcademyCourse } from './academy-seed-shared'

/** Slugs replaced by the numbered 5-block route — removed on re-seed. */
const DEPRECATED_ROUTE_SLUGS = [
  'genesis',
  'fundamentos-clinica-digital',
  '01-fundamentos',
  '02-practica-digital',
  'practica-digital',
  'praxis',
  'validacion',
  'portal-clinico',
] as const

const DEPRECATED_ROUTE_IDS = ['course_01_fundamentos', 'course_practica_digital'] as const

/** Seeds all five PSM route blocks: 01 Génesis … 05 Portal Clínico. */
export async function seedAcademyRuta(prisma: PrismaClient) {
  console.log('🌱 Seeding Academy — 5 bloques (01 Génesis … 05 Portal)...')

  const removedSlugs = await prisma.course.deleteMany({
    where: { slug: { in: [...DEPRECATED_ROUTE_SLUGS] } },
  })
  const removedIds = await prisma.course.deleteMany({
    where: { id: { in: [...DEPRECATED_ROUTE_IDS] } },
  })
  const removed = removedSlugs.count + removedIds.count
  if (removed > 0) {
    console.log(`🗑️  Removed ${removed} deprecated course(s)`)
  }

  const genesis = await seedAcademyGenesisWithCleanup(prisma)
  const fundamentos = await seedAcademyFundamentos(prisma)
  const routeBlocks = await seedAcademyRouteBlocks(prisma)
  const praxisCatalog = []
  for (const course of buildPraxisCatalogCourses()) {
    praxisCatalog.push(await upsertAcademyCourse(prisma, course))
  }
  await archiveLegacyCursoOnline(prisma)

  console.log('✅ Ruta completa: 5 bloques + catálogo Praxis')
  return { genesis, fundamentos, routeBlocks, praxisCatalog }
}
