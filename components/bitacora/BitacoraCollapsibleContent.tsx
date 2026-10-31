'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BitacoraEntryContent } from '@/components/bitacora/BitacoraEntryContent'

const COLLAPSE_CHAR_THRESHOLD = 220
const COLLAPSE_LINE_THRESHOLD = 5

function isLongEntry(content: string): boolean {
  if (content.length > COLLAPSE_CHAR_THRESHOLD) return true
  return content.split('\n').filter((l) => l.trim()).length > COLLAPSE_LINE_THRESHOLD
}

type Props = {
  content: string
  defaultExpanded?: boolean
}

export function BitacoraCollapsibleContent({ content, defaultExpanded = false }: Props) {
  const long = useMemo(() => isLongEntry(content), [content])
  const [expanded, setExpanded] = useState(defaultExpanded || !long)

  if (!long) {
    return <BitacoraEntryContent content={content} />
  }

  return (
    <div className="min-w-0">
      <div
        className={
          expanded
            ? 'min-w-0'
            : 'max-h-[7.5rem] overflow-hidden relative min-w-0 rounded-lg'
        }
      >
        <BitacoraEntryContent content={content} className={expanded ? undefined : 'mb-0'} />
        {!expanded && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background via-background/80 to-transparent"
            aria-hidden
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 inline-flex items-center gap-1 text-sm text-mauve-400 hover:text-mauve-300 transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Contraer
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Ver texto completo
          </>
        )}
      </button>
    </div>
  )
}
