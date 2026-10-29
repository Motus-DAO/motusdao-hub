import { NextRequest, NextResponse } from "next/server";
import { getAIClient, getAIModel, getAIProvider, getVeniceChatOptions, hasAIKey } from "@/lib/ai-client";
import { isKnowledgeRagEnabled, retrieveMotusContext } from "@/lib/motus-knowledge";
import { isUsableChatOutput, sanitizeModelOutput, SHORT_INPUT_FALLBACK } from "@/lib/ai-output";
import { requireAiProcessingConsent } from "@/lib/auth/ai-consent";
import { handleAuthError } from "@/lib/auth/session";
import { AiCreditExhaustedError, estimateTokens, formatCreditNote } from "@/lib/ai-credit";
import { getCreditSnapshot, releaseAiCredit, reserveAiCredit, settleAiCredit } from "@/lib/ai-credit-store";
import {
  getPsychatSystemPrompt,
  normalizePsychatRole,
  resolvePsychatStructuredMode,
  type PsychatStructuredMode,
} from "@/lib/psychat-prompt";
import type OpenAI from "openai";

const SUPERVISOR_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "SupervisorOutput",
    schema: {
      type: "object" as const,
      additionalProperties: false,
      properties: {
        apertura: { type: "string" as const },
        reflexion: { type: "string" as const },
        cierre: { type: "string" as const },
        recomendacion: { type: "string" as const },
        disponibilidad: { type: "string" as const }
      },
      required: ["apertura","reflexion","cierre","recomendacion","disponibilidad"]
    }
  }
};

const EXPLORACION_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "ExploracionOutput",
    schema: {
      type: "object" as const,
      additionalProperties: false,
      properties: {
        eco: { type: "string" as const },
        pregunta: { type: "string" as const },
        abierto: { type: "string" as const },
        limite: { type: "string" as const },
        puenteHumano: { type: "string" as const },
      },
      required: ["eco", "pregunta", "abierto", "limite", "puenteHumano"],
    },
  },
};

type StructuredSchema = typeof SUPERVISOR_SCHEMA | typeof EXPLORACION_SCHEMA;

function responseFormatForMode(mode: PsychatStructuredMode): StructuredSchema {
  return mode === "supervisor" ? SUPERVISOR_SCHEMA : EXPLORACION_SCHEMA;
}

async function createReliableChatCompletion(
  client: OpenAI,
  messages: Array<{ role: "system" | "assistant" | "user"; content: string }>,
  options: { temperature: number; max_tokens: number; response_format?: StructuredSchema }
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const base = {
    model: getAIModel(),
    messages,
    ...getVeniceChatOptions(),
    ...options,
  }

  const attempts = [
    { ...base, temperature: options.temperature },
    { ...base, temperature: Math.min(options.temperature, 0.3) },
  ]

  let promptTokens = 0
  let completionTokens = 0
  const inputText = messages.map((message) => message.content).join("\n")

  for (const params of attempts) {
    const response = await client.chat.completions.create(params)
    const raw = response.choices[0]?.message?.content ?? ""
    promptTokens += response.usage?.prompt_tokens ?? estimateTokens(inputText)
    completionTokens += response.usage?.completion_tokens ?? estimateTokens(raw)
    const cleaned = sanitizeModelOutput(raw)
    if (isUsableChatOutput(cleaned)) return { text: cleaned, promptTokens, completionTokens }
  }

  return { text: SHORT_INPUT_FALLBACK, promptTokens, completionTokens }
}

export async function POST(req: NextRequest) {
  let userId: string
  let hubRole = normalizePsychatRole(null)
  try {
    const session = await requireAiProcessingConsent(req)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub para usar la IA.' }, { status: 403 })
    }
    userId = session.userId
    hubRole = normalizePsychatRole(session.role)
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }

  if (!hasAIKey()) {
    return NextResponse.json({ error: `Missing ${getAIProvider() === 'venice' ? 'VENICE_INFERENCE_KEY' : 'OPENAI_API_KEY'}` }, { status: 503 });
  }

  try {
    const client = getAIClient();
    const body = await req.json();
    const rawMessages = body?.messages
    if (!Array.isArray(rawMessages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }
    const userMessages = (rawMessages as {role:"user"|"assistant"|"system", content:string}[])
      .filter((message) => message.role === "user" || message.role === "assistant");
    const clientSnippets = (body?.contextSnippets || []) as string[];

    const lastUser = userMessages.slice().reverse().find(m => m.role === "user");
    const userText = lastUser?.content || "";
    const structuredMode = resolvePsychatStructuredMode(hubRole, userText);

    const input: Array<{ role: "system" | "assistant" | "user"; content: string }> = [
      { role: "system", content: getPsychatSystemPrompt(hubRole) },
    ];

    let ragSources: Array<{ sourcePath: string; title: string; namespace: string; similarity: number }> = [];
    let contextSnippets = [...clientSnippets];

    if (isKnowledgeRagEnabled() && userText && !structuredMode) {
      try {
        const retrieved = await retrieveMotusContext(userText);
        if (retrieved.snippets.length) {
          contextSnippets = retrieved.snippets;
          ragSources = retrieved.sources.map(({ sourcePath, title, namespace, similarity }) => ({
            sourcePath,
            title,
            namespace,
            similarity,
          }));
        }
      } catch (ragError) {
        console.error('[chat] RAG retrieval failed, continuing without context:', ragError);
      }
    }

    if (contextSnippets.length) {
      input.push({ 
        role: "assistant", 
        content: `Contexto verificado (no inventar fuera de esto):\n${contextSnippets.join("\n---\n")}` 
      });
    }

    userMessages.forEach(msg => {
      input.push({ role: msg.role, content: msg.content });
    });

    const requestedMaxTokens = structuredMode ? 1000 : 800
    const model = getAIModel()
    const hold = await reserveAiCredit({
      userId,
      model,
      inputText: input.map((message) => message.content).join("\n"),
      requestedMaxTokens,
    })

    let settled = false
    try {
      const result = await createReliableChatCompletion(client, input, {
        ...(structuredMode ? { response_format: responseFormatForMode(structuredMode) } : {}),
        temperature: 0.7,
        max_tokens: hold.maxTokens,
      })
      await settleAiCredit(hold.chargeId, {
        model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      })
      settled = true
      const credit = await getCreditSnapshot(userId)

      if (structuredMode === "supervisor") {
        let json;
        try {
          json = JSON.parse(result.text);
        } catch {
          json = {
            apertura: "Error en el análisis",
            reflexion: "No se pudo procesar la respuesta",
            cierre: "Reintentar el análisis",
            recomendacion: "Contactar soporte técnico",
            disponibilidad: "Disponible para nueva consulta"
          };
        }

        return NextResponse.json({
          mode: "supervisor",
          ...json,
          ragSources,
          credit,
          creditNote: formatCreditNote(credit),
        });
      }

      if (structuredMode === "exploracion") {
        let json;
        try {
          json = JSON.parse(result.text);
        } catch {
          json = {
            eco: "No pude procesar bien lo que compartiste.",
            pregunta: "¿Quieres contarme un poco más con tus palabras?",
            abierto: "Queda espacio para seguir explorando.",
            limite: "No soy terapeuta ni sustituyo atención profesional.",
            puenteHumano: "Si quieres profundizar con una persona, usa el botón Terapeuta humano en Psychat.",
          };
        }

        return NextResponse.json({
          mode: "exploracion",
          handoffSuggested: true,
          ...json,
          ragSources,
          credit,
          creditNote: formatCreditNote(credit),
        });
      }

      return NextResponse.json({
        mode: "qa",
        text: result.text,
        ragSources,
        ragEnabled: isKnowledgeRagEnabled(),
        credit,
        creditNote: formatCreditNote(credit),
      });
    } catch (completionError) {
      if (!settled) await releaseAiCredit(hold.chargeId)
      throw completionError
    }

  } catch (e: unknown) {
    if (e instanceof AiCreditExhaustedError) {
      return NextResponse.json(
        { error: e.message, code: 'ai_credit_exhausted', remainingUsd: e.remainingUsd },
        { status: 429 }
      )
    }

    const provider = getAIProvider();
    const providerLabel = provider === 'venice' ? 'Venice' : 'OpenAI';
    console.error(`${providerLabel} API Error:`, e);

    if (e instanceof Error) {
      if (e.message.includes('API key')) {
        return NextResponse.json(
          {
            error:
              provider === 'venice'
                ? 'Venice API key not configured'
                : 'OpenAI API key not configured',
          },
          { status: 401 }
        );
      }
      if (e.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: (e as Error)?.message || `${providerLabel} error` },
      { status: 500 }
    );
  }
}
