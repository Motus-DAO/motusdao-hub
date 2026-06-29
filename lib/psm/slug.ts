/**
 * SEO-friendly slug generation for PSM public profiles.
 */
export function slugifySegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildPsmSlug(params: {
  nombre: string
  apellido: string
  topSpecialty?: string
  userId: string
}): string {
  const namePart = slugifySegment(
    `${params.nombre}-${params.apellido || 'profesional'}`
  )
  const specialtyPart = params.topSpecialty
    ? `-${slugifySegment(params.topSpecialty)}`
    : ''
  const suffix = params.userId.slice(0, 6)
  const base = `${namePart}${specialtyPart}-${suffix}`
  return base.slice(0, 120)
}

export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  if (!(await exists(base))) return base
  let i = 2
  while (await exists(`${base}-${i}`)) {
    i += 1
  }
  return `${base}-${i}`
}
