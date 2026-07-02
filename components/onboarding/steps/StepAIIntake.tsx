'use client'

import { useState, useCallback, useMemo } from 'react'
import { Bot, Loader, Send, AlertCircle } from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import {
  useOnboardingStore,
  UserRole,
  OnboardingData,
  getStepBlockers,
  getStepBlockerKeys,
} from '@/lib/onboarding-store'
import { computeFieldProgress } from '@/lib/intake-chat-progress'
import { buildPsmAvailability } from '@/lib/intake/psm-intake-v1'
import { IntakeChatStepper } from '@/components/onboarding/IntakeChatStepper'
import { IntakeLiveForm } from '@/components/onboarding/IntakeLiveForm'
import { cn } from '@/lib/utils'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type IntakeResponse = {
  assistantMessage: string
  isComplete: boolean
  missingFields: string[]
  confidence: 'low' | 'medium' | 'high'
  extractedData: Partial<OnboardingData>
  riskAlert: 'none' | 'crisis_possible'
  phase?: string
  questionIndex?: number
}

interface StepAIIntakeProps {
  role: UserRole
  onNext: () => void
}

const starterByRole: Record<UserRole, string> = {
  usuario:
    'Hola, soy tu asistente de intake de MotusDAO. Empezaré con 3 preguntas breves.\n\n**Pregunta 1:** Cuéntame sobre ti (nombre, ciudad, país) y qué te motiva a buscar apoyo psicológico.',
  psm:
    'Hola, soy tu asistente de intake de MotusDAO. Empezaré con 3 preguntas breves.\n\n**Pregunta 1:** Cuéntame tu nombre, formación académica, cédula profesional y años de experiencia.',
}

function renderMessageContent(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

function buildInitialChatState(
  role: UserRole,
  data: Partial<OnboardingData>
): {
  messages: ChatMessage[]
  phase: string
  questionIndex: number
  isComplete: boolean
} {
  const blockers = getStepBlockers(3, role, data)
  const fp = computeFieldProgress(role, data as Record<string, unknown>)
  const pct = fp.total > 0 ? Math.round((fp.filledCount / fp.total) * 100) : 0

  if (blockers.length === 0) {
    return {
      messages: [
        {
          role: 'assistant',
          content:
            'Tu perfil está completo. Revisa el formulario de abajo y pulsa **Continuar** para pasar a la revisión final.',
        },
      ],
      phase: 'handoff_ready',
      questionIndex: 3,
      isComplete: true,
    }
  }

  const hasSubstantialData =
    fp.filledCount >= Math.max(3, Math.floor(fp.total * 0.4)) ||
    Boolean(data.nombre && data.apellido)

  if (hasSubstantialData) {
    return {
      messages: [
        {
          role: 'assistant',
          content: `Ya tenemos **${fp.filledCount} de ${fp.total}** campos de tu perfil (${pct}%).\n\nSolo falta completar: **${blockers.join(', ')}**.\n\nNo necesitas repetir el cuestionario — complétalo en el **formulario de abajo** (recomendado) o dímelo aquí en el chat.`,
        },
      ],
      phase: 'handoff_ready',
      questionIndex: 3,
      isComplete: false,
    }
  }

  return {
    messages: [{ role: 'assistant', content: starterByRole[role] }],
    phase: 'intake_q1',
    questionIndex: 1,
    isComplete: false,
  }
}

export function StepAIIntake({ role, onNext }: StepAIIntakeProps) {
  const { data, updateData } = useOnboardingStore()
  const initial = useMemo(() => buildInitialChatState(role, data), []) // eslint-disable-line react-hooks/exhaustive-deps

  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages)
  const [input, setInput] = useState('')
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(initial.isComplete)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [riskAlert, setRiskAlert] = useState<'none' | 'crisis_possible'>('none')
  const [phase, setPhase] = useState<string>(initial.phase)
  const [questionIndex, setQuestionIndex] = useState<number>(initial.questionIndex)
  const [highlightKeys, setHighlightKeys] = useState<string[]>([])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding/ai-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          messages: nextMessages,
          currentData: data,
          phase,
          questionIndex,
        }),
      })

      const body = (await response.json()) as IntakeResponse | { error?: string; details?: string }

      if (!response.ok || ('error' in body && body.error)) {
        const detail =
          'details' in body && body.details ? `: ${body.details}` : ''
        throw new Error(
          ('error' in body && body.error ? body.error : 'No se pudo procesar el intake') + detail
        )
      }
      const intakeBody = body as IntakeResponse
      const extracted = intakeBody.extractedData as Partial<OnboardingData>
      const legacyLicensed = extracted.licensedCountries
      const merged = {
        ...data,
        ...extracted,
        credentialedCountries:
          extracted.credentialedCountries ??
          (legacyLicensed && !extracted.countriesWhereCanReceivePatients
            ? legacyLicensed
            : data.credentialedCountries),
        countriesWhereCanReceivePatients:
          extracted.countriesWhereCanReceivePatients ??
          extracted.licensedRegions ??
          legacyLicensed ??
          data.countriesWhereCanReceivePatients,
        excludedCases:
          extracted.excludedCases ?? extracted.exclusionCriteria ?? data.excludedCases,
        clinicalComplexityLevels:
          extracted.clinicalComplexityLevels ??
          (extracted.worksWithUrgencyLevels as string[] | undefined) ??
          data.clinicalComplexityLevels,
      } as Partial<OnboardingData>

      updateData({
        ...extracted,
        credentialedCountries: merged.credentialedCountries,
        countriesWhereCanReceivePatients: merged.countriesWhereCanReceivePatients,
        licensedCountries: merged.credentialedCountries,
        licensedRegions: merged.countriesWhereCanReceivePatients,
        excludedCases: merged.excludedCases,
        exclusionCriteria: merged.excludedCases,
        clinicalComplexityLevels: merged.clinicalComplexityLevels,
        professionalNarrative:
          extracted.professionalNarrative ?? extracted.biografia,
        biografia: extracted.professionalNarrative ?? extracted.biografia,
        maxActiveUsers:
          extracted.maxActiveUsers ?? extracted.maxActivePatients,
        maxActivePatients:
          extracted.maxActiveUsers ?? extracted.maxActivePatients,
        weeklyTherapyHours: extracted.weeklyTherapyHours,
        emergencyProtocolStatus: extracted.emergencyProtocolStatus,
        serviceTypes: extracted.serviceTypes,
        intakeSource: 'ai_assisted',
        availability: buildPsmAvailability(merged),
      })
      setMissingFields(intakeBody.missingFields)
      setIsComplete(intakeBody.isComplete)
      setRiskAlert(intakeBody.riskAlert)
      if (intakeBody.phase) setPhase(intakeBody.phase)
      if (intakeBody.questionIndex) setQuestionIndex(intakeBody.questionIndex)
      setHighlightKeys([])
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: intakeBody.assistantMessage },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar intake con IA')
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, role, data, phase, questionIndex, updateData])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const handleContinue = () => {
    const store = useOnboardingStore.getState()
    if (!store.canProceed()) {
      const blockerKeys = getStepBlockerKeys(3, role, store.data)
      const blockers = getStepBlockers(3, role, store.data)
      setHighlightKeys(blockerKeys)
      setError(
        blockers.length > 0
          ? `Falta: ${blockers.join(', ')}. Complétalo en el formulario resaltado abajo.`
          : 'Aún no puedes continuar. Revisa el formulario de abajo.'
      )
      return
    }
    setError(null)
    setHighlightKeys([])
    onNext()
  }

  const showChatInput = phase !== 'handoff_ready' || messages.some((m) => m.role === 'user')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-mauve-600 dark:text-mauve-400" />
        <h3 className="text-lg font-semibold">Intake asistido por IA</h3>
      </div>

      <IntakeChatStepper
        role={role}
        phase={phase}
        questionIndex={questionIndex}
        captured={data as Record<string, unknown>}
        intakeComplete={isComplete}
      />

      {phase === 'handoff_ready' && !showChatInput && (
        <div className="rounded-xl border border-emerald-300/70 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100">
          Perfil casi listo — completa los campos pendientes en el formulario y continúa al registro.
        </div>
      )}

      <section className="rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground">Conversación</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Responde las preguntas del asistente. Tus respuestas se reflejan en el formulario.
          </p>
        </div>

        <div className="h-80 overflow-y-auto bg-background/60 p-4 space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'max-w-[92%] rounded-xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                message.role === 'assistant'
                  ? 'border-border bg-muted/50 text-foreground'
                  : 'ml-auto border-mauve-500/30 bg-mauve-500/10 text-foreground'
              )}
            >
              {renderMessageContent(message.content)}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4 animate-spin" />
              Analizando respuesta...
            </div>
          )}
        </div>

        {showChatInput && (
          <div className="border-t border-border bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                placeholder="Escribe tu respuesta... (Enter para enviar)"
                className="min-h-24 flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-mauve-500/40 focus:border-mauve-500/50"
              />
              <CTAButton
                type="button"
                onClick={() => void sendMessage()}
                disabled={isLoading || !input.trim()}
                className="self-stretch sm:self-end min-w-[3rem]"
              >
                {isLoading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </CTAButton>
            </div>
          </div>
        )}
      </section>

      {riskAlert === 'crisis_possible' && (
        <div className="rounded-xl border border-red-300/70 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" />
            Posible situación de crisis detectada
          </div>
          <p className="mt-1">
            Este flujo no sustituye atención de emergencia. Si hay riesgo inmediato,
            contacta servicios de emergencia locales.
          </p>
        </div>
      )}

      {missingFields.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Faltan datos: {missingFields.join(', ')}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-300/70 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <IntakeLiveForm
        role={role}
        alwaysOpen
        highlightKeys={highlightKeys}
      />

      <div className="flex justify-end pt-2 border-t border-border">
        <CTAButton type="button" onClick={handleContinue}>
          Continuar con datos capturados
        </CTAButton>
      </div>
    </div>
  )
}
