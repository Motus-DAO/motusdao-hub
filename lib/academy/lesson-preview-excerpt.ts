/** Plain-text excerpt from lesson MDX for free-preview teasers on course pages. */
export function lessonPreviewExcerpt(
  contentMDX: string | null | undefined,
  maxChars = 320,
): string | null {
  if (!contentMDX?.trim()) return null

  const text = contentMDX
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~`>#]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n/g, ' ')
    .trim()

  if (!text) return null
  if (text.length <= maxChars) return text

  const sliced = text.slice(0, maxChars)
  const lastSpace = sliced.lastIndexOf(' ')
  const cut = lastSpace > maxChars * 0.6 ? sliced.slice(0, lastSpace) : sliced
  return `${cut.trim()}…`
}
