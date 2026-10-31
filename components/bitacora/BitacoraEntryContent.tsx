'use client'

import { useMemo } from 'react'
import { renderMarkdown } from '@/lib/academy/markdown'

type Props = {
  content: string
  className?: string
}

/** Journal body — supports Markdown; safe overflow inside cards. */
export function BitacoraEntryContent({ content, className = '' }: Props) {
  const html = useMemo(() => renderMarkdown(content), [content])

  return (
    <div
      className={`bitacora-entry-prose academy-prose min-w-0 max-w-full overflow-x-auto break-words [overflow-wrap:anywhere] text-foreground mb-4 leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
