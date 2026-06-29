import { marked, Renderer, type Tokens } from 'marked'

marked.setOptions({
  breaks: true,
  gfm: true,
})

class LessonMarkdownRenderer extends Renderer {
  table(token: Tokens.Table): string {
    let html = '<div class="academy-table-wrapper"><table><thead><tr>'
    for (const cell of token.header) {
      html += this.tablecell(cell)
    }
    html += '</tr></thead><tbody>'
    for (const row of token.rows) {
      html += '<tr>'
      for (const cell of row) {
        html += this.tablecell(cell)
      }
      html += '</tr>'
    }
    html += '</tbody></table></div>'
    return html
  }
}

const lessonRenderer = new LessonMarkdownRenderer()

/** Lesson pages already render `lesson.title` as the page H1 — demote markdown H1s to H2. */
function prepareLessonMarkdown(content: string): string {
  return content.replace(/^#\s+(.+)$/m, '## $1')
}

export function renderMarkdown(content: string, options?: { lessonContent?: boolean }): string {
  try {
    const source = options?.lessonContent ? prepareLessonMarkdown(content) : content
    const result = options?.lessonContent
      ? marked.parse(source, { renderer: lessonRenderer })
      : marked.parse(source)
    if (typeof result === 'string') return result
    return content
  } catch {
    return content
  }
}

export function videoEmbedUrl(url: string): { type: 'iframe' | 'video'; src: string } | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  )
  if (youtubeMatch) {
    return { type: 'iframe', src: `https://www.youtube.com/embed/${youtubeMatch[1]}` }
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch) {
    return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeoMatch[1]}` }
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return { type: 'video', src: trimmed }
    }
  } catch {
    return null
  }

  return null
}
