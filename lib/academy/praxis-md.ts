/** Split approved Praxis markdown into modules/lessons without rewriting copy. */

export type ParsedFrontmatter = Record<string, string>

export type ParsedLesson = {
  heading: string
  title: string
  body: string
}

export type ParsedModule = {
  heading: string
  title: string
  lessons: ParsedLesson[]
}

export type ParsedPraxisMarkdown = {
  frontmatter: ParsedFrontmatter
  intro: string
  modules: ParsedModule[]
  trailingSections: Array<{ heading: string; title: string; body: string }>
}

function stripQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function parseFrontmatter(source: string): { frontmatter: ParsedFrontmatter; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { frontmatter: {}, body: source.trimStart() }

  const frontmatter: ParsedFrontmatter = {}
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = stripQuotes(line.slice(idx + 1))
    if (key) frontmatter[key] = value
  }

  return { frontmatter, body: source.slice(match[0].length).trimStart() }
}

function titleFromHeading(heading: string, prefix: RegExp): string {
  const withoutHash = heading.replace(/^#+\s+/, '').trim()
  const withoutPrefix = withoutHash.replace(prefix, '').trim()
  return withoutPrefix.replace(/^—\s*/, '').replace(/^-\s*/, '').trim() || withoutHash
}

function splitByHeading(source: string, headingRe: RegExp): {
  before: string
  parts: Array<{ heading: string; body: string }>
} {
  const flags = headingRe.flags.includes('m') ? headingRe.flags : `${headingRe.flags}m`
  const re = new RegExp(headingRe.source, flags)
  const matches = [...source.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))]
  if (matches.length === 0) return { before: source, parts: [] }

  const firstIndex = matches[0].index ?? 0
  const before = source.slice(0, firstIndex).trim()
  const parts: Array<{ heading: string; body: string }> = []

  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index ?? 0
    const heading = matches[i][0].trim()
    const contentStart = start + matches[i][0].length
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? source.length) : source.length
    parts.push({ heading, body: source.slice(contentStart, end).replace(/^\r?\n/, '').trimEnd() })
  }

  return { before, parts }
}

function parseLessons(moduleBody: string): ParsedLesson[] {
  const { before, parts } = splitByHeading(moduleBody, /^## Lección \d+[^\n]*/m)
  if (parts.length === 0) {
    const trimmed = moduleBody.trim()
    if (!trimmed) return []
    return [{ heading: '', title: '', body: trimmed }]
  }

  return parts.map((part, index) => {
    const prefix = index === 0 && before ? `${before.trim()}\n\n` : ''
    const body = `${prefix}${part.body}`.trim()
    return {
      heading: part.heading,
      title: titleFromHeading(part.heading, /^Lección \d+\s*/),
      body,
    }
  })
}

export function parsePraxisMarkdown(source: string): ParsedPraxisMarkdown {
  const { frontmatter, body } = parseFrontmatter(source)
  const { before: introRaw, parts: moduleParts } = splitByHeading(body, /^# Módulo \d+[^\n]*/m)

  const modules: ParsedModule[] = []
  const trailingSections: Array<{ heading: string; title: string; body: string }> = []

  for (const part of moduleParts) {
    const { before: afterLessons, parts: trailing } = splitByHeading(part.body, /^# (?!Módulo \d)[^\n]*/m)
    const lessons = parseLessons(afterLessons)
    modules.push({
      heading: part.heading,
      title: titleFromHeading(part.heading, /^Módulo \d+\s*/),
      lessons,
    })
    for (const section of trailing) {
      trailingSections.push({
        heading: section.heading,
        title: titleFromHeading(section.heading, /^$/),
        body: section.body.trim(),
      })
    }
  }

  if (moduleParts.length === 0) {
    const { before, parts } = splitByHeading(introRaw, /^# (?!Módulo \d)[^\n]*/m)
    return {
      frontmatter,
      intro: before,
      modules: [],
      trailingSections: parts.map((section) => ({
        heading: section.heading,
        title: titleFromHeading(section.heading, /^$/),
        body: section.body.trim(),
      })),
    }
  }

  return {
    frontmatter,
    intro: introRaw.trim(),
    modules,
    trailingSections,
  }
}

export function firstParagraph(markdown: string): string {
  const withoutHeading = markdown.replace(/^#\s+[^\n]+\n+/, '')
  const block = withoutHeading.split(/\n{2,}/).find((chunk) => {
    const line = chunk.trim()
    return line.length > 0 && !line.startsWith('#') && !line.startsWith('---') && !line.startsWith('|')
  })
  if (!block) return ''
  return block
    .replace(/\*\*/g, '')
    .replace(/^>\s*/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
}

export function extractBulletOutcomes(markdown: string): string[] {
  const match = markdown.match(/Al terminar podrás:\n\n((?:- .+\n)+)/)
  if (match) {
    return match[1]
      .split('\n')
      .map((line) => line.replace(/^- /, '').replace(/;$/, '').trim())
      .filter(Boolean)
  }

  const praxisMatch = markdown.match(/## Lo que vas a hacer en Praxis\n\n((?:- .+\n)+)/)
  if (praxisMatch) {
    return praxisMatch[1]
      .split('\n')
      .map((line) => line.replace(/^- /, '').replace(/\.$/, '').trim())
      .filter(Boolean)
  }

  return []
}

export function durationFromBody(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(8, Math.round(words / 150))
}

/** Drop the editorial UI spec so lesson 8 does not repeat the catalog as markdown. */
export function stripInterfaceProgressSpec(body: string): string {
  return body
    .replace(
      /## Tu progreso en la colección actual[\s\S]*?(?=\n### ¿Por qué completar los cinco\?|\n## ¿Por qué completar los cinco\?)/,
      '',
    )
    .replace(/> En la interfaz, cada producto debe mostrarse[\s\S]*?\n\n/, '')
    .trim()
}

/** Public-facing author naming — mechanical, not a clinical rewrite. */
export function applyPublicAuthorName(text: string): string {
  const marker = 'Maestro Benjamin Buzali'
  return text
    .split(marker)
    .map((chunk) =>
      chunk
        .replace(/\bBenjamin Buzali\b/g, marker)
        .replace(/\bBenjamin\b/g, marker)
        .replace(/\bBen\b/g, marker),
    )
    .join(marker)
}

export function applyPublicAuthorAttribution(text: string): string {
  return applyPublicAuthorName(
    text
      .replace(
        /método(?: desarrollado)? de (?:Maestro )?Benjamin(?: Buzali)?/gi,
        'propuesta clínica y lógico-formal de Maestro Benjamin Buzali',
      )
      .replace(/método Benjamin/gi, 'propuesta clínica y lógico-formal de Maestro Benjamin Buzali')
      .replace(
        /modelo clínico desarrollado por (?:Maestro )?Benjamin(?: Buzali)?/gi,
        'modelo lógico-clínico desarrollado por Maestro Benjamin Buzali',
      )
      .replace(
        /el modelo de (?:Maestro )?Benjamin(?: Buzali)?/gi,
        'el modelo lógico-clínico desarrollado por Maestro Benjamin Buzali',
      ),
  )
}

export function lessonBodyWithoutRepeatedTitle(title: string, body: string): string {
  const trimmed = body.trim()
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return trimmed.replace(new RegExp(`^#\\s+${escaped}\\s*\\n+`), '').trim()
}
