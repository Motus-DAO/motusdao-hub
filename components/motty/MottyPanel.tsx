'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { MottyMarkdown } from '@/components/motty/MottyMarkdown'
import { MOTTY_DEFAULT_LOCALE, mottyCopy } from '@/lib/motty/copy'
import { useUIStore } from '@/lib/store'
import type { MottyMessage } from '@/lib/motty/types'

type ChatLine = MottyMessage

/**
 * Authenticated Motty panel for Acompañamiento Personalizado Digital.
 * Session userId is bound server-side; this client never sends userId.
 */
export function MottyPanel() {
  const locale = MOTTY_DEFAULT_LOCALE
  const copy = mottyCopy(locale)
  const { theme } = useUIStore()
  const isLight = theme === 'light'
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [lines, setLines] = useState<ChatLine[]>([
    { role: 'assistant', content: copy.greeting },
  ])
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const titleId = useId()

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [lines, pending])

  const send = useCallback(async () => {
    const message = input.trim()
    if (!message || pending) return

    setInput('')
    setPending(true)
    setLines((current) => [...current, { role: 'user', content: message }])

    try {
      const response = await fetch('/api/motty/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, locale }),
      })
      const json = (await response.json()) as { reply?: string; error?: string }
      const reply =
        json.reply?.trim() ||
        (response.status === 401
          ? 'Inicia sesión para usar Motty.'
          : response.status === 429
            ? 'Demasiados mensajes. Espera un momento.'
            : copy.error)
      setLines((current) => [...current, { role: 'assistant', content: reply }])
    } catch {
      setLines((current) => [
        ...current,
        { role: 'assistant', content: copy.error },
      ])
    } finally {
      setPending(false)
    }
  }, [input, pending, locale, copy.error])

  return (
    <section
      aria-labelledby={titleId}
      className={`flex flex-col overflow-hidden rounded-2xl border ${
        isLight
          ? 'border-zinc-200 bg-white text-zinc-900'
          : 'border-white/10 bg-zinc-950/80 text-zinc-50'
      }`}
    >
      <header
        className={`border-b px-4 py-3 sm:px-5 ${
          isLight ? 'border-zinc-100' : 'border-white/10'
        }`}
      >
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
            isLight ? 'text-violet-700' : 'text-violet-300'
          }`}
        >
          Acompañamiento Personalizado Digital
        </p>
        <h2 id={titleId} className="mt-1 text-base font-semibold tracking-tight">
          {copy.title}
        </h2>
        <p
          className={`mt-1 text-xs leading-relaxed ${
            isLight ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          Preguntas a tu ritmo · orientación en la ruta · recursos del Hub. No
          sustituye supervisión humana.
        </p>
      </header>

      <div
        ref={listRef}
        className="flex max-h-[min(420px,50vh)] min-h-[220px] flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-5"
        role="log"
        aria-live="polite"
      >
        {lines.map((line, index) => (
          <div
            key={`${line.role}-${index}`}
            className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
              line.role === 'user'
                ? isLight
                  ? 'ml-auto bg-violet-600 text-white'
                  : 'ml-auto bg-violet-500/90 text-white'
                : isLight
                  ? 'bg-zinc-100 text-zinc-800'
                  : 'bg-white/5 text-zinc-100'
            }`}
          >
            {line.role === 'assistant' ? (
              <MottyMarkdown>{line.content}</MottyMarkdown>
            ) : (
              line.content
            )}
          </div>
        ))}
        {pending && (
          <div
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
              isLight ? 'bg-zinc-100 text-zinc-500' : 'bg-white/5 text-zinc-400'
            }`}
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Pensando…
          </div>
        )}
      </div>

      <form
        className={`flex items-end gap-2 border-t px-3 py-3 sm:px-4 ${
          isLight ? 'border-zinc-100' : 'border-white/10'
        }`}
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        <label className="sr-only" htmlFor={`${titleId}-input`}>
          Mensaje para Motty
        </label>
        <textarea
          id={`${titleId}-input`}
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void send()
            }
          }}
          placeholder={copy.placeholder}
          disabled={pending}
          className={`min-h-[42px] flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
            isLight
              ? 'border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400'
              : 'border-white/10 bg-black/30 text-zinc-50 placeholder:text-zinc-500'
          }`}
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          aria-label={copy.send}
          className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
        </button>
      </form>
    </section>
  )
}
