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
import { IntakeChatStepper } from '@/components/onboarding/IntakeChatStepper'
import { IntakeLiveForm } from '@/components/onboarding/IntakeLiveForm'

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

      updateData({
        ...intakeBody.extractedData,
        intakeSource: 'ai_assisted',
        availability:
          intakeBody.extractedData.availability ||
          (intakeBody.extractedData.availabilityNotes
            ? { notes: intakeBody.extractedData.availabilityNotes }
            : data.availability),
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
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-mauve-400" />
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
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Perfil casi listo — completa los campos pendientes en el formulario y continúa al registro.
        </div>
      )}

      <div className="h-80 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
              message.role === 'assistant'
                ? 'bg-white/10 text-gray-100'
                : 'bg-mauve-500/20 text-white ml-8'
            }`}
          >
            {message.content}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader className="h-4 w-4 animate-spin" />
            Analizando respuesta...
          </div>
        )}
      </div>

      {riskAlert === 'crisis_possible' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
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
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground">
          Faltan datos: {missingFields.join(', ')}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {showChatInput && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="Escribe tu respuesta... (Enter para enviar)"
            className="min-h-24 flex-1 resize-none rounded-xl border border-white/15 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-mauve-500"
          />
          <CTAButton
            type="button"
            onClick={() => void sendMessage()}
            disabled={isLoading || !input.trim()}
            className="self-stretch sm:self-end"
          >
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </CTAButton>
        </div>
      )}

      <IntakeLiveForm
        role={role}
        defaultOpen
        highlightKeys={highlightKeys}
      />

      <div className="flex justify-end">
        <CTAButton type="button" onClick={handleContinue}>
          Continuar con datos capturados
        </CTAButton>
      </div>
    </div>
  )
}
