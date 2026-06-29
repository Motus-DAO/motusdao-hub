/** @deprecated slugs → canonical route slug */
export const LEGACY_BLOCK_SLUG_ALIASES: Record<string, string> = {
  genesis: '01-genesis',
  'fundamentos-clinica-digital': '01-genesis',
  '01-fundamentos': '02-fundamentos',
  '02-practica-digital': '02-fundamentos',
  'practica-digital': '02-fundamentos',
  praxis: '03-praxis',
  '03-praxis': '03-praxis',
  validacion: '04-validacion',
  '04-validacion': '04-validacion',
  'portal-clinico': '05-portal-clinico',
  '05-portal-clinico': '05-portal-clinico',
}

export const ROUTE_BLOCK_SLUG_ORDER = [
  '01-genesis',
  '02-fundamentos',
  '03-praxis',
  '04-validacion',
  '05-portal-clinico',
] as const

export function resolveRouteBlockSlug(slug: string): string {
  return LEGACY_BLOCK_SLUG_ALIASES[slug] ?? slug
}

export function sortRouteBlockCourses<T extends { slug: string; title: string }>(courses: T[]): T[] {
  return [...courses].sort((a, b) => {
    const ai = ROUTE_BLOCK_SLUG_ORDER.indexOf(a.slug as (typeof ROUTE_BLOCK_SLUG_ORDER)[number])
    const bi = ROUTE_BLOCK_SLUG_ORDER.indexOf(b.slug as (typeof ROUTE_BLOCK_SLUG_ORDER)[number])
    if (ai === -1 && bi === -1) return a.title.localeCompare(b.title, 'es')
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}
