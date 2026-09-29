'use client'

import { marked } from 'marked'
import { useMemo } from 'react'

marked.setOptions({ breaks: true, gfm: true })

type MottyMarkdownProps = {
  children: string
}

export function MottyMarkdown({ children }: MottyMarkdownProps) {
  const html = useMemo(() => {
    try {
      const result = marked.parse(children)
      return typeof result === 'string' ? result : children
    } catch {
      return children
    }
  }, [children])

  return (
    <div
      className="motty-md prose prose-sm max-w-none dark:prose-invert [&_a]:text-violet-400 [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
