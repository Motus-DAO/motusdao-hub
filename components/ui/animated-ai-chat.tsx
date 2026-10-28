'use client'

import * as React from 'react'
import { useEffect, useRef, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  Brain,
  FileText,
  LoaderIcon,
  MessageSquare,
  PhoneCall,
  SendIcon,
  ChevronDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { marked } from 'marked'
import { useUIStore, type UserRole } from '@/lib/store'
import { psychatPrivacyTeaser, VENICE_PRIVACY_URL } from '@/lib/ai-consent-copy'
import { creditUsedPercent } from '@/lib/ai-credit'
import { sendEncryptedPsychat } from '@/lib/venice-e2ee'
import { sendPsychatViaRootRouterProxy } from '@/lib/psychat-context/send-local-proxy'

marked.setOptions({ breaks: true, gfm: true })

function renderMarkdown(content: string): string {
  try {
    const result = marked(content)
    return typeof result === 'string' ? result : content
  } catch {
    return content
  }
}

interface UseAutoResizeTextareaProps {
  minHeight: number
  maxHeight?: number
}

function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current
      if (!textarea) return

      if (reset) {
        textarea.style.height = `${minHeight}px`
        return
      }

      textarea.style.height = `${minHeight}px`
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY),
      )
      textarea.style.height = `${newHeight}px`
    },
    [minHeight, maxHeight],
  )

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) textarea.style.height = `${minHeight}px`
  }, [minHeight])

  useEffect(() => {
    const handleResize = () => adjustHeight()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [adjustHeight])

  return { textareaRef, adjustHeight }
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string
  showRing?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)

    return (
      <div className={cn('relative', containerClassName)}>
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'transition-all duration-200 ease-in-out',
            'placeholder:text-muted-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
            showRing ? 'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0' : '',
            className,
          )}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {showRing && isFocused && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-violet-500/30 ring-offset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'

interface RagSource {
  sourcePath: string
  title: string
  namespace: string
  similarity: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ragSources?: RagSource[]
}

const USUARIO_GREETING =
  '¡Hola! Soy Psychat, tu asistente especializado en salud mental. ¿En qué puedo ayudarte hoy?'

const PSM_GREETING =
  'Hola. Soy Psychat en modo de apoyo clínico. Comparte tu caso (anónimo) o activa el Modo Supervisor para una reflexión estructurada.'

const CLINICAL_EXAMPLE =
  'Tengo un paciente que tiene ansiedad. Comenta que no se siente "el hombre", por lo que he decidido abordar este tema desde la teoría de género y social, dándole herramientas de nuevas masculinidades y enfocándome en trabajar su autoestima.'

export interface AnimatedAIChatProps {
  fullScreen?: boolean
  role?: UserRole
  onRequestHumanSession?: () => void | Promise<void>
  isCreatingSession?: boolean
  sessionError?: string | null
  /** When set, the composer does not call the model. */
  sendBlockedReason?: string | null
  providerLabel?: string
  /** venice | openai. The Venice note renders only for venice. */
  aiProvider?: string | null
  modelLabel?: string | null
  modelId?: string | null
  privacyMode?: 'tee' | 'e2ee'
  onPrivacyModeChange?: (mode: 'tee' | 'e2ee') => void
  credit?: {
    remainingUsd: number
    allowanceUsd: number
    dailyUsd: number
    purchasedUsd: number
  } | null
  onCreditRefresh?: () => void
  onBuyCredit?: (amountUsd: 5 | 10) => void
  buyingPack?: 5 | 10 | null
  creditShopError?: string | null
  notice?: React.ReactNode
  onMessagesChange?: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) => void
  /** When this key changes, the thread resets or loads `loadedThread`. */
  chatSessionKey?: string
  loadedThread?: Array<{ role: 'user' | 'assistant'; content: string }> | null
  /** Slice 5 — RootRouter / enclave context routing */
  contextModeLabel?: string
  useRootRouterProxy?: boolean
  rootRouterProxyUrl?: string
  onOpenContextSettings?: () => void
}

export function AnimatedAIChat({
  fullScreen = true,
  role = 'usuario',
  onRequestHumanSession,
  isCreatingSession = false,
  sessionError = null,
  sendBlockedReason = null,
  aiProvider = null,
  modelId = null,
  privacyMode = 'tee',
  onPrivacyModeChange,
  credit = null,
  onCreditRefresh,
  onBuyCredit,
  buyingPack = null,
  creditShopError = null,
  notice = null,
  onMessagesChange,
  chatSessionKey = 'default',
  loadedThread = null,
  contextModeLabel = 'Estándar (Hub)',
  useRootRouterProxy = false,
  rootRouterProxyUrl = '',
  onOpenContextSettings,
}: AnimatedAIChatProps) {
  const containerHeightClass = fullScreen ? 'min-h-screen' : 'min-h-[calc(100dvh-8rem)]'
  const { theme } = useUIStore()
  const isLight = theme === 'light'
  const isPsm = role === 'psm'

  const [value, setValue] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const e2eeAvailable = aiProvider === 'venice' && (!modelId || modelId.startsWith('e2ee-'))
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: isPsm ? PSM_GREETING : USUARIO_GREETING,
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  })
  const [inputFocused, setInputFocused] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (!onMessagesChange) return
    onMessagesChange(
      messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }))
    )
  }, [messages, onMessagesChange])

  useEffect(() => {
    if (loadedThread && loadedThread.length > 0) {
      setMessages(
        loadedThread.map((m, i) => ({
          id: `thread-${chatSessionKey}-${i}`,
          role: m.role,
          content: m.content,
        }))
      )
    } else {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: isPsm ? PSM_GREETING : USUARIO_GREETING,
        },
      ])
    }
    setValue('')
    setError(null)
  }, [chatSessionKey, loadedThread, isPsm])

  const handleSendMessage = () => {
    const userMessage = value.trim()
    if (!userMessage || isTyping || sendBlockedReason) return

    setValue('')
    adjustHeight(true)
    setError(null)
    setIsTyping(true)

    const nextMessages: ChatMessage[] = [
      ...messages,
      { id: `user-${Date.now()}`, role: 'user', content: userMessage },
    ]
    setMessages(nextMessages)

    const apiMessages = nextMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const useProxy =
      useRootRouterProxy && privacyMode === 'tee' && rootRouterProxyUrl.trim().length > 0

    const request =
      privacyMode === 'e2ee'
        ? sendEncryptedPsychat(
            apiMessages.filter((message) => message.role === 'user' || message.role === 'assistant')
          ).then((text) => ({ mode: 'qa' as const, text }))
        : useProxy
          ? sendPsychatViaRootRouterProxy(
              rootRouterProxyUrl,
              modelId || 'gpt-4o-mini',
              apiMessages.filter((message) => message.role === 'user' || message.role === 'assistant')
            ).then((r) => ({ mode: 'qa' as const, text: r.text }))
          : fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: apiMessages }),
          }).then(async (res) => {
            const data = (await res.json().catch(() => ({}))) as {
              error?: string
              code?: string
              mode?: string
              text?: string
              message?: string
              apertura?: string
              reflexion?: string
              cierre?: string
              recomendacion?: string
              disponibilidad?: string
              ragSources?: RagSource[]
            }
            if (!res.ok) {
              if (data.code === 'ai_credit_exhausted') {
                setError(data.error || 'Se acabó el crédito de IA de hoy.')
                onCreditRefresh?.()
                return null
              }
              throw new Error(data.error || 'Error al procesar la solicitud')
            }
            return data
          })

    void request
      .then((data) => {
        if (!data) return
        onCreditRefresh?.()
        let content = ''
        if (data.mode === 'supervisor' && 'apertura' in data) {
          content = `## Apertura de significantes\n\n${data.apertura}\n\n## Reflexión sobre el discurso\n\n${data.reflexion}\n\n## Cierre analítico\n\n${data.cierre}\n\n## Recomendación final\n\n${data.recomendacion}\n\n## Disponibilidad\n\n${data.disponibilidad}`
        } else {
          const message = 'message' in data ? data.message : undefined
          content = data.text || message || 'No se pudo generar una respuesta.'
        }

        const ragSources = 'ragSources' in data && Array.isArray(data.ragSources) ? data.ragSources : undefined
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content,
            ragSources,
          },
        ])
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Error al conectar con Psychat'
        setError(msg)
        if (privacyMode === 'e2ee') return
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content:
              'Lo siento, estoy experimentando dificultades técnicas. Por favor, intenta de nuevo en unos momentos.',
          },
        ])
      })
      .finally(() => {
        setIsTyping(false)
      })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) handleSendMessage()
    }
  }

  const fillPrompt = (text: string) => {
    setValue(text)
    requestAnimationFrame(() => adjustHeight())
  }

  const actionButtonClass = cn(
    'group relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors sm:text-sm',
    isLight
      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
      : 'bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white',
  )

  return (
    <div
      className={cn(
        'relative flex w-full flex-col items-center overflow-hidden bg-transparent p-4 sm:p-6',
        fullScreen ? 'justify-center' : 'justify-start',
        isLight ? 'text-slate-900' : 'text-white',
        containerHeightClass,
      )}
    >
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-violet-500/10 blur-[128px] filter" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 animate-pulse rounded-full bg-indigo-500/10 blur-[128px] delay-700 filter" />
        <div className="absolute right-1/3 top-1/4 h-64 w-64 animate-pulse rounded-full bg-fuchsia-500/10 blur-[96px] delay-1000 filter" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col">
        <motion.div
          className="relative z-10 flex min-h-0 flex-1 flex-col gap-6 sm:gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="shrink-0 space-y-3 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <h1 className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text pb-1 text-2xl font-medium tracking-tight text-transparent sm:text-3xl">
                {isPsm ? '¿Qué caso quieres supervisar?' : '¿Cómo puedo ayudarte hoy?'}
              </h1>
              <motion.div
                className="h-px bg-gradient-to-r from-violet-500/0 via-fuchsia-400/70 to-pink-500/0"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '100%', opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.p
              className={cn(
                'text-sm',
                isLight
                  ? 'text-slate-600'
                  : 'bg-gradient-to-r from-violet-300/90 to-pink-400/85 bg-clip-text text-transparent',
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {isPsm ? 'Consulta clínica o supervisión analítica' : 'Tu asistente de salud mental'}
            </motion.p>
            {notice}
          </div>

          {(error || sessionError) && (
            <div className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error || sessionError}
            </div>
          )}

          <div
            ref={messagesContainerRef}
            className={cn(
              'min-h-[200px] flex-1 space-y-3 overflow-y-auto overscroll-y-contain rounded-2xl border p-4',
              isLight ? 'border-slate-300/70 bg-white/70' : 'border-white/[0.05] bg-black/20',
            )}
            aria-live="polite"
            aria-label="Mensajes del chat"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex w-full', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl px-3 py-2 text-sm sm:max-w-[80%]',
                    m.role === 'user'
                      ? isLight
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-black'
                      : isLight
                        ? 'border border-slate-200 bg-white text-slate-800'
                        : 'bg-white/[0.06] text-white/90',
                  )}
                >
                  {m.role === 'assistant' ? (
                    <div
                      className="prose prose-sm max-w-none prose-headings:text-violet-300 prose-strong:text-violet-300"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                    />
                  ) : (
                    m.content
                  )}
                  {m.role === 'assistant' && m.ragSources && m.ragSources.length > 0 && (
                    <details className="mt-2 text-xs opacity-80">
                      <summary className="cursor-pointer">Fuentes RAG ({m.ragSources.length})</summary>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {m.ragSources.map((src) => (
                          <li key={`${src.sourcePath}-${src.similarity}`}>
                            [{src.namespace}] {src.title} · {src.similarity.toFixed(3)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>

          <motion.div
            className={cn(
              'relative shrink-0 rounded-2xl border shadow-2xl backdrop-blur-2xl',
              isLight ? 'border-slate-300/70 bg-white/70' : 'border-white/[0.05] bg-white/[0.02]',
            )}
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="p-4">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  adjustHeight()
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={
                  isPsm ? 'Describe tu caso clínico o consulta de supervisión...' : 'Escribe tu mensaje...'
                }
                containerClassName="w-full"
                className={cn(
                  'min-h-[60px] w-full resize-none border-none bg-transparent px-4 py-3 text-sm focus:outline-none',
                  isLight ? 'text-slate-900 placeholder:text-slate-500' : 'text-white/90 placeholder:text-white/20',
                )}
                style={{ overflow: 'hidden' }}
                showRing={false}
                disabled={isTyping}
                aria-label="Escribe tu mensaje"
              />
            </div>

            <div
              className={cn(
                'flex flex-wrap items-center justify-between gap-3 border-t p-3 sm:p-4',
                isLight ? 'border-slate-300/70' : 'border-white/[0.05]',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {isPsm ? (
                  <>
                    <motion.button type="button" onClick={() => fillPrompt(CLINICAL_EXAMPLE)} whileTap={{ scale: 0.94 }} className={actionButtonClass}>
                      <FileText className="h-4 w-4" />
                      <span>Caso clínico ejemplo</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => fillPrompt('Activa Modo Supervisor')}
                      whileTap={{ scale: 0.94 }}
                      className={actionButtonClass}
                    >
                      <Brain className="h-4 w-4" />
                      <span>Modo Supervisor</span>
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.button
                      type="button"
                      onClick={() => fillPrompt('¿Cómo puedo manejar la ansiedad?')}
                      whileTap={{ scale: 0.94 }}
                      className={actionButtonClass}
                    >
                      <Brain className="h-4 w-4" />
                      <span>Manejar ansiedad</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => fillPrompt('Necesito técnicas de relajación')}
                      whileTap={{ scale: 0.94 }}
                      className={actionButtonClass}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Relajación</span>
                    </motion.button>
                    {onRequestHumanSession && (
                      <motion.button
                        type="button"
                        onClick={() => void onRequestHumanSession()}
                        disabled={isCreatingSession}
                        whileTap={{ scale: 0.94 }}
                        className={cn(
                          actionButtonClass,
                          isLight
                            ? 'border border-mauve-500/40 bg-mauve-100 text-mauve-900 hover:bg-mauve-200'
                            : 'border border-mauve-500/40 bg-mauve-500/20 text-mauve-100 hover:bg-mauve-500/30',
                          'disabled:opacity-50',
                        )}
                      >
                        <PhoneCall className="h-4 w-4" />
                        <span>{isCreatingSession ? 'Conectando...' : 'Terapeuta humano'}</span>
                      </motion.button>
                    )}
                  </>
                )}
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                {credit ? (
                  <CreditMeter credit={credit} isLight={isLight} privacyMode={privacyMode} />
                ) : null}
                <motion.button
                  type="button"
                  onClick={handleSendMessage}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isTyping || !value.trim() || Boolean(sendBlockedReason)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    value.trim()
                      ? isLight
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-300/60'
                        : 'bg-white text-[#0A0A0B] shadow-lg shadow-white/10'
                      : isLight
                        ? 'bg-slate-200/80 text-slate-500'
                        : 'bg-white/[0.05] text-white/40',
                  )}
                >
                  {isTyping ? (
                    <LoaderIcon className="h-4 w-4 animate-[spin_2s_linear_infinite]" />
                  ) : (
                    <SendIcon className="h-4 w-4" />
                  )}
                  <span>Enviar</span>
                </motion.button>
              </div>
            </div>

            <div
              className={cn(
                'border-t px-4 pb-4 pt-3 text-xs',
                isLight ? 'border-slate-300/70 text-slate-600' : 'border-white/[0.05] text-white/60',
              )}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Image src="/venice-logo.svg" alt="" width={14} height={14} className="rounded-sm" aria-hidden />
                <span className={cn('font-medium', isLight ? 'text-slate-700' : 'text-white/80')}>Psychat</span>
                <span className={isLight ? 'text-slate-500' : 'text-white/45'}>·</span>
                <a
                  href={VENICE_PRIVACY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={cn('underline', isLight ? 'text-slate-600' : 'text-white/55')}
                >
                  Privacidad del proveedor
                </a>
              </div>
              {aiProvider === 'venice' ? (
                <>
                  <p className="mt-1.5 leading-relaxed">{psychatPrivacyTeaser(privacyMode)}</p>
                  {onOpenContextSettings ? (
                    <button
                      type="button"
                      onClick={onOpenContextSettings}
                      className={cn(
                        'mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1',
                        isLight ? 'border-slate-300 text-slate-800' : 'border-white/15 text-white/75'
                      )}
                    >
                      Memoria: {contextModeLabel}
                    </button>
                  ) : null}
                  {useRootRouterProxy && privacyMode === 'e2ee' ? (
                    <p className="mt-1 text-amber-400/90">
                      Memoria RootRouter requiere modo estándar (TEE), no reforzado (E2EE).
                    </p>
                  ) : null}
                  <button
                    type="button"
                    aria-expanded={advancedOpen}
                    onClick={() => setAdvancedOpen((open) => !open)}
                    className={cn(
                      'mt-2 inline-flex items-center gap-1 font-medium',
                      isLight ? 'text-slate-800' : 'text-white/80'
                    )}
                  >
                    Ajustes avanzados
                    <ChevronDown className={cn('h-3 w-3 transition', advancedOpen && 'rotate-180')} />
                  </button>
                  {advancedOpen ? (
                    <fieldset className="mt-2 space-y-3">
                      <legend className="font-medium">Modo de privacidad al enviar</legend>
                      <label className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="psychat-privacy"
                          className="mt-1"
                          checked={privacyMode === 'tee'}
                          onChange={() => onPrivacyModeChange?.('tee')}
                        />
                        <span>
                          <span className="font-medium">Estándar (TEE).</span> Motus enruta tu consulta al
                          proveedor de IA; el modelo corre en un entorno aislado y protegido (Trusted Execution
                          Environment).
                        </span>
                      </label>
                      <label className={cn('flex items-start gap-2', !e2eeAvailable && 'opacity-50')}>
                        <input
                          type="radio"
                          name="psychat-privacy"
                          className="mt-1"
                          checked={privacyMode === 'e2ee'}
                          disabled={!e2eeAvailable}
                          onChange={() => onPrivacyModeChange?.('e2ee')}
                        />
                        <span>
                          <span className="font-medium">Reforzado (E2EE).</span> Cifras en el navegador antes de
                          enviar; Motus no puede leer el contenido en tránsito hacia el servicio de IA.
                        </span>
                      </label>
                      <p className={cn('text-[11px] leading-relaxed', isLight ? 'text-slate-500' : 'text-white/45')}>
                        Modelo, flujo completo y límites:{' '}
                        <a href="/psychat/archivo" className="underline">
                          guía Psychat → archivo
                        </a>
                        .
                      </p>
                    </fieldset>
                  ) : null}
                </>
              ) : null}
              {onBuyCredit ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {([5, 10] as const).map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      disabled={buyingPack !== null}
                      onClick={() => onBuyCredit(amount)}
                      className={cn(
                        'rounded-md border px-2 py-1',
                        isLight ? 'border-slate-300 text-slate-800' : 'border-white/20 text-white/80'
                      )}
                    >
                      {buyingPack === amount ? 'Abriendo pago…' : `Comprar ${amount} USD`}
                    </button>
                  ))}
                </div>
              ) : null}
              {creditShopError ? <p className="mt-1">{creditShopError}</p> : null}
              {isPsm ? (
                <p className="mt-1">No incluyas datos identificables de pacientes. Las emergencias se revisan con humanos.</p>
              ) : null}
              {sendBlockedReason ? <p className="mt-1">{sendBlockedReason}</p> : null}
            </div>
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/[0.05] bg-white/[0.02] px-4 py-2 shadow-lg backdrop-blur-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-7 w-8 items-center justify-center rounded-full text-center',
                  isLight ? 'bg-slate-200/90' : 'bg-white/[0.05]',
                )}
              >
                <span className={cn('mb-0.5 text-xs font-medium', isLight ? 'text-slate-800' : 'text-white/90')}>
                  ✦
                </span>
              </div>
              <div className={cn('flex items-center gap-2 text-sm', isLight ? 'text-slate-600' : 'text-white/70')}>
                <span>Pensando</span>
                <TypingDots isLight={isLight} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {inputFocused && (
        <motion.div
          className="pointer-events-none fixed z-0 h-[50rem] w-[50rem] rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 opacity-[0.02] blur-[96px]"
          animate={{
            x: mousePosition.x - 400,
            y: mousePosition.y - 400,
          }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}
    </div>
  )
}

function CreditMeter({
  credit,
  isLight,
  privacyMode,
}: {
  credit: {
    remainingUsd: number
    allowanceUsd: number
    dailyUsd: number
    purchasedUsd: number
  }
  isLight: boolean
  privacyMode: 'tee' | 'e2ee'
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const used = creditUsedPercent(credit)
  const left = 100 - used
  const privacyLabel = privacyMode === 'e2ee' ? 'Privacidad reforzada' : 'Privacidad estándar'
  const size = 20
  const trackWidth = 2
  const arcWidth = 2.5
  const radius = (size - arcWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dash = used >= 100 ? circumference : (used / 100) * circumference
  const arc = isLight ? '#e11d48' : '#ffffff'
  const track = isLight ? 'rgba(15,23,42,0.18)' : 'rgba(255,255,255,0.2)'

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Uso, ${used}%. ${privacyLabel}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          isLight ? 'hover:bg-slate-200/80' : 'hover:bg-white/[0.06]',
        )}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ maxWidth: 'none' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={trackWidth} />
          {used > 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc}
              strokeWidth={arcWidth}
              strokeLinecap={used >= 100 ? 'butt' : 'round'}
              strokeDasharray={`${dash} ${circumference}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dasharray 400ms ease' }}
            />
          ) : null}
        </svg>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Detalle del crédito"
          style={{ width: 280, maxWidth: 'none' }}
          className={cn(
            'absolute bottom-full right-0 z-30 mb-2 rounded-xl border px-3 py-3 text-left text-sm leading-snug shadow-xl',
            isLight
              ? 'border-slate-300/80 bg-white text-slate-700'
              : 'border-white/15 bg-[#16161a] text-white/80',
          )}
        >
          <p className={cn('font-medium', isLight ? 'text-slate-900' : 'text-white')}>{used}% usado</p>
          <p className="mt-2">Te queda {left}% del uso de hoy.</p>
          <p className="mt-2">{privacyLabel}</p>
          <p className="mt-2">Se renueva a medianoche, hora de Ciudad de México.</p>
        </div>
      ) : null}
    </div>
  )
}

function TypingDots({ isLight }: { isLight: boolean }) {
  return (
    <div className="ml-1 flex items-center">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className={cn('mx-0.5 h-1.5 w-1.5 rounded-full', isLight ? 'bg-slate-700' : 'bg-white/90')}
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
