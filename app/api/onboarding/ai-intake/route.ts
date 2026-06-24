import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAIClient, getAIModel, getAIProvider, hasAIKey } from '@/lib/ai-client'
import { getPsmMissingFieldKeys } from '@/lib/intake/psm-intake-v1'
import { getFieldOrder } from '@/lib/intake-chat-progress'
import type { OnboardingData } from '@/lib/onboarding-store'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
})

const requestSchema = z.object({
  role: z.enum(['usuario', 'psm']),
  messages: z.array(messageSchema).min(1),
  currentData: z.record(z.unknown()).optional(),
  phase: z.string().optional(),
  questionIndex: z.number().int().min(1).max(3).optional(),
})

const RESPONSE_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'OnboardingIntake',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        assistantMessage: { type: 'string' },
        isComplete: { type: 'boolean' },
        missingFields: {
          type: 'array',
          items: { type: 'string' },
        },
        confidence: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
        },
        extractedData: {
          type: 'object',
          additionalProperties: true,
        },
        riskAlert: {
          type: 'string',
          enum: ['none', 'crisis_possible'],
        },
        phase: {
          type: 'string',
          enum: ['intake_q1', 'intake_q2', 'intake_q3', 'handoff_ready'],
        },
        questionIndex: { type: 'integer', minimum: 1, maximum: 3 },
      },
      required: [
        'assistantMessage',
        'isComplete',
        'missingFields',
        'confidence',
        'extractedData',
        'riskAlert',
        'phase',
        'questionIndex',
      ],
    },
  },
}

const QUESTION_GUIDE = {
  usuario: {
    q1: 'nombre, apellido, telefono, fechaNacimiento, ciudad, pais, problematica',
    q2: 'clinicalConcern, preferenciaAsignacion, urgencyLevel, preferredModality, languages, availabilityNotes, preferredTherapyStyle',
    q3: 'consentToAIProcessing, consentToShareWithPSM, consentToClinicalMatching (y campos opcionales restantes)',
  },
  psm: {
    q1: 'nombre, apellido, telefono, fechaNacimiento, ciudad, pais, cedulaProfesional, formacionAcademica, experienciaAnios',
    q2: 'professionalNarrative, therapyStyles, especialidades, languages, timezone',
    q3: 'weeklyTherapyHours, maxActiveUsers, credentialedCountries, countriesWhereCanReceivePatients, serviceTypes, clinicalComplexityLevels, excludedCases, emergencyProtocolStatus, isAcceptingUsers (documentos y declaraciones legales se completan en el formulario)',
  },
}

const SYSTEM_PROMPT = `Eres un asistente de intake de MotusDAO para salud mental. Recopila datos de onboarding SIN dar consejo medico, diagnosticos ni tratamiento.

Flujo estricto de 3 preguntas:
- Fase intake_q1 / questionIndex 1: haz SOLO la pregunta 1 y extrae sus campos.
- Tras respuesta suficiente a Q1, avanza a intake_q2 / questionIndex 2.
- Tras respuesta suficiente a Q2, avanza a intake_q3 / questionIndex 3.
- Tras respuesta suficiente a Q3, phase=handoff_ready, questionIndex=3, isComplete=true si todos los campos requeridos estan presentes.

Reglas:
- Responde siempre en espanol.
- Una pregunta enfocada por turno; no hagas multiples preguntas largas.
- Extrae datos en extractedData con claves exactas. Fusiona con datos actuales; no borres campos ya capturados.
- No inventes datos. Campos faltantes van en missingFields.
- Si hay senales de crisis, autolesion o emergencia: riskAlert=crisis_possible, urgencyLevel=crisis (usuario), recomienda ayuda local brevemente.
- Valores: urgencyLevel low|medium|high|crisis. preferredModality video|chat|in_person|hybrid (solo usuario). preferenciaAsignacion automatica|explorar.
- Arrays: clinicalConcern, preferredTherapyStyle, languages, especialidades, therapyStyles, credentialedCountries, countriesWhereCanReceivePatients, serviceTypes, clinicalComplexityLevels, excludedCases, riskFlags.
- clinicalComplexityLevels valores: low_complexity, medium_complexity, high_with_support, no_active_crisis.
- serviceTypes valores: individual_therapy, psychological_guidance, psychoeducation, clinical_supervision, groups_workshops, courses, psychological_assessment, non_clinical_support, research_interviews.
- excludedCases: slugs preset (self_harm_crisis, active_psychosis, substance_detox, legal_forensic, minors, active_violence_no_support, unstable_medical_psychiatric, case_by_case_intake) o texto libre para casos adicionales.
- emergencyProtocolStatus: own_protocol, institutional_protocol, not_yet, want_motus_guidance.
- Usuario requerido: nombre, apellido, telefono, fechaNacimiento, ciudad, pais, problematica, preferenciaAsignacion, urgencyLevel, preferredModality, languages, consentToAIProcessing=true, consentToShareWithPSM=true, consentToClinicalMatching=true. clinicalConcern es recomendado pero opcional; si lo puedes inferir desde problematica, incluyelo como array.
- PSM requerido: nombre, apellido, telefono, fechaNacimiento, ciudad, pais, cedulaProfesional, formacionAcademica, experienciaAnios, professionalNarrative (min 80 chars), therapyStyles, especialidades, languages, timezone, weeklyTherapyHours (1-80), maxActiveUsers, credentialedCountries, countriesWhereCanReceivePatients, serviceTypes (min 1), clinicalComplexityLevels (min 1), excludedCases (min 1), emergencyProtocolStatus. NO autocompletar legalDeclarations.
- assistantMessage debe ser conversacional y terminar con la siguiente pregunta (excepto en handoff_ready).

Devuelve JSON con: assistantMessage, isComplete, missingFields, confidence, extractedData, riskAlert, phase, questionIndex.`

function parseAIJson(text: string): Record<string, unknown> {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] || text
  return JSON.parse(jsonText) as Record<string, unknown>
}

function normalizeParsedResponse(
  parsed: Record<string, unknown>,
  role: 'usuario' | 'psm',
  mergedData: Record<string, unknown>,
  currentPhase: string,
  currentQ: number
): {
  assistantMessage: string
  isComplete: boolean
  missingFields: string[]
  confidence: string
  extractedData: Record<string, unknown>
  riskAlert: 'none' | 'crisis_possible'
  phase: string
  questionIndex: number
} {
  const extractedData =
    typeof parsed.extractedData === 'object' && parsed.extractedData !== null
      ? (parsed.extractedData as Record<string, unknown>)
      : {}

  const missingFields = computeMissingFields(role, mergedData)
  const rawPhase = parsed.phase
  const phase =
    typeof rawPhase === 'string'
      ? rawPhase
      : typeof rawPhase === 'number'
        ? `intake_q${rawPhase}`
        : currentPhase

  const rawQ = parsed.questionIndex
  const questionIndex =
    typeof rawQ === 'number' && rawQ >= 1 && rawQ <= 3
      ? rawQ
      : currentQ

  const isComplete =
    Boolean(parsed.isComplete) ||
    phase === 'handoff_ready' ||
    (missingFields.length === 0 && questionIndex >= 3)

  return {
    assistantMessage:
      typeof parsed.assistantMessage === 'string'
        ? parsed.assistantMessage
        : 'Gracias. ¿Puedes contarme un poco más?',
    isComplete,
    missingFields:
      Array.isArray(parsed.missingFields) && parsed.missingFields.length > 0
        ? (parsed.missingFields as string[])
        : missingFields,
    confidence:
      typeof parsed.confidence === 'string'
        ? parsed.confidence
        : typeof parsed.confidence === 'number'
          ? parsed.confidence > 0.7
            ? 'high'
            : 'medium'
          : 'medium',
    extractedData,
    riskAlert: parsed.riskAlert === 'crisis_possible' ? 'crisis_possible' : 'none',
    phase: isComplete ? 'handoff_ready' : phase,
    questionIndex: isComplete ? 3 : questionIndex,
  }
}

function computeMissingFields(
  role: 'usuario' | 'psm',
  data: Record<string, unknown>
): string[] {
  if (role === 'psm') {
    return getPsmMissingFieldKeys(data as Partial<OnboardingData>)
  }

  const required = [
    'nombre',
    'apellido',
    'telefono',
    'fechaNacimiento',
    'ciudad',
    'pais',
    'problematica',
    'preferenciaAsignacion',
    'urgencyLevel',
    'preferredModality',
    'languages',
    'availabilityNotes',
    'consentToAIProcessing',
    'consentToShareWithPSM',
    'consentToClinicalMatching',
  ]

  return required.filter((key) => {
    const value = data[key]
    if (value == null) return true
    if (typeof value === 'boolean') return !value
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'number') return Number.isNaN(value)
    return String(value).trim().length === 0
  })
}

export async function POST(request: NextRequest) {
  if (!hasAIKey()) {
    return NextResponse.json(
      {
        error: `Missing ${getAIProvider() === 'venice' ? 'VENICE_INFERENCE_KEY' : 'OPENAI_API_KEY'}`,
      },
      { status: 401 }
    )
  }

  try {
    const client = getAIClient()
    const body = requestSchema.parse(await request.json())
    const fields = getFieldOrder(body.role).join(', ')
    const provider = getAIProvider()
    const guide = QUESTION_GUIDE[body.role]
    const currentPhase = body.phase || 'intake_q1'
    const currentQ = body.questionIndex || 1

    const veniceJsonReminder =
      provider === 'venice'
        ? '\nCRITICAL: Respond with ONLY a raw JSON object. No markdown fences, no text before or after JSON.'
        : ''

    const response = await client.chat.completions.create({
      model: getAIModel(),
      ...(provider === 'openai' ? { response_format: RESPONSE_SCHEMA } : {}),
      temperature: 0.2,
      max_tokens: 1400,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'system',
          content: `Rol: ${body.role}. Fase actual: ${currentPhase}, questionIndex: ${currentQ}.
Q1 campos: ${guide.q1}
Q2 campos: ${guide.q2}
Q3 campos: ${guide.q3}
Todos los campos: ${fields}
Datos actuales: ${JSON.stringify(body.currentData || {})}
Devuelve SOLO JSON valido con assistantMessage, isComplete, missingFields, confidence, extractedData, riskAlert, phase, questionIndex.${veniceJsonReminder}`,
        },
        ...body.messages.map((message) => ({
          role: message.role as 'user' | 'assistant',
          content: message.content,
        })),
      ],
    })

    const text = response.choices[0]?.message?.content || '{}'
    let parsed: Record<string, unknown>
    try {
      parsed = parseAIJson(text)
    } catch {
      parsed = {
        assistantMessage:
          text.trim() ||
          'Gracias por tu respuesta. ¿Puedes darme un poco más de detalle?',
        isComplete: false,
        missingFields: [],
        confidence: 'low',
        extractedData: {},
        riskAlert: 'none',
        phase: currentPhase,
        questionIndex: currentQ,
      }
    }

    const mergedData = {
      ...(body.currentData || {}),
      ...(typeof parsed.extractedData === 'object' && parsed.extractedData !== null
        ? (parsed.extractedData as Record<string, unknown>)
        : {}),
    }

    const normalized = normalizeParsedResponse(
      parsed,
      body.role,
      mergedData,
      currentPhase,
      currentQ
    )

    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Error in onboarding AI intake:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos de entrada invalidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Error al procesar intake con IA',
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : undefined,
      },
      { status: 500 }
    )
  }
}
