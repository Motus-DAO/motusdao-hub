import { NextRequest, NextResponse } from "next/server";
import {
  getAIClient,
  getAIModel,
  getAIProvider,
  getVeniceChatOptions,
  getVeniceSupervisorTeeParameters,
  hasAIKey,
  PSM_SUPERVISOR_STRUCTURED_MAX_TOKENS,
  resolvePsychatChatModel,
  VENICE_PSM_SUPERVISOR_TEE_MODEL,
} from "@/lib/ai-client";
import { isKnowledgeRagEnabled, retrieveMotusContext } from "@/lib/motus-knowledge";
import { isUsableChatOutput, sanitizeModelOutput, SHORT_INPUT_FALLBACK } from "@/lib/ai-output";
import { requireAiProcessingConsent } from "@/lib/auth/ai-consent";
import { handleAuthError } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AiCreditExhaustedError, estimateTokens, formatCreditNote } from "@/lib/ai-credit";
import { getCreditSnapshot, releaseAiCredit, reserveAiCredit, settleAiCredit } from "@/lib/ai-credit-store";
import {
  getPsychatSystemPrompt,
  normalizePsychatRole,
  resolvePsychatStructuredMode,
  type PsychatStructuredMode,
} from "@/lib/psychat-prompt";
import {
  parseStructuredOutput,
  PSYCHAT_STRUCTURED_OUTPUT_ERROR,
  validateStructuredPayload,
} from "@/lib/psychat-structured-output";
import type OpenAI from "openai";

/** Venice Qwen supervisor can exceed 30s on cold start; align with client timeout when raised. */
export const maxDuration = 60;

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

function veniceStructuredJsonReminder(mode: PsychatStructuredMode): string {
  const keys =
    mode === "supervisor"
      ? "apertura, reflexion, cierre, recomendacion, disponibilidad"
      : "eco, pregunta, abierto, limite, puenteHumano";
  return `\n\nCRITICAL: Respond with ONLY a raw JSON object with keys: ${keys}. No markdown fences, no text before or after JSON. Do not include a "mode" property.`;
}

function structuredOutputFailure(
  hubRole: ReturnType<typeof normalizePsychatRole>,
  structuredMode: PsychatStructuredMode
) {
  return NextResponse.json(
    {
      error: PSYCHAT_STRUCTURED_OUTPUT_ERROR,
      code: "structured_output_failed",
      psychatHubRole: hubRole,
      structuredMode,
    },
    { status: 502 }
  );
}

async function createReliableChatCompletion(
  client: OpenAI,
  messages: Array<{ role: "system" | "assistant" | "user"; content: string }>,
  options: {
    model: string;
    temperature: number;
    max_tokens: number;
    response_format?: StructuredSchema;
    venice_parameters?: ReturnType<typeof getVeniceSupervisorTeeParameters>;
    singleAttempt?: boolean;
  }
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const base = {
    model: options.model,
    messages,
    ...getVeniceChatOptions(),
    temperature: options.temperature,
    max_tokens: options.max_tokens,
    ...(options.response_format ? { response_format: options.response_format } : {}),
    ...(options.venice_parameters ? { venice_parameters: options.venice_parameters } : {}),
  }

  const attempts = options.singleAttempt
    ? [{ ...base, temperature: options.temperature }]
    : [
        { ...base, temperature: options.temperature },
        { ...base, temperature: Math.min(options.temperature, 0.3) },
      ]

  let promptTokens = 0
  let completionTokens = 0
  const inputText = messages.map((message) => message.content).join("\n")

  for (const params of attempts) {
    const response = await client.chat.completions.create(params as OpenAI.ChatCompletionCreateParamsNonStreaming)
    const raw = response.choices[0]?.message?.content ?? ""
    promptTokens += response.usage?.prompt_tokens ?? estimateTokens(inputText)
    completionTokens += response.usage?.completion_tokens ?? estimateTokens(raw)
    const cleaned = sanitizeModelOutput(raw)
    if (isUsableChatOutput(cleaned)) return { text: cleaned, promptTokens, completionTokens }
  }

  return { text: SHORT_INPUT_FALLBACK, promptTokens, completionTokens }
}

function structuredFieldsFromCompletion(
  structuredMode: PsychatStructuredMode,
  result: { text: string }
): Record<string, string> | null {
  if (result.text === SHORT_INPUT_FALLBACK) return null

  let parsed: Record<string, unknown>
  try {
    parsed = parseStructuredOutput(result.text)
  } catch {
    return null
  }

  return validateStructuredPayload(structuredMode, parsed)
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    hubRole = normalizePsychatRole(user?.role)
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
    const requestStructuredReport = body?.requestStructuredReport === true;

    const lastUser = userMessages.slice().reverse().find(m => m.role === "user");
    const userText = lastUser?.content || "";
    const structuredMode = resolvePsychatStructuredMode(hubRole, userText, {
      requestStructuredReport,
    });

    if (requestStructuredReport && hubRole === "psm" && !userText.trim()) {
      return NextResponse.json(
        { error: "Escribe o envía al menos un mensaje de caso antes del reporte estructurado." },
        { status: 400 }
      );
    }

    const input: Array<{ role: "system" | "assistant" | "user"; content: string }> = [
      { role: "system", content: getPsychatSystemPrompt(hubRole) },
    ];

    const provider = getAIProvider();
    if (structuredMode === "supervisor" && provider === "venice") {
      input[0].content += veniceStructuredJsonReminder(structuredMode);
    }

    let ragSources: Array<{ sourcePath: string; title: string; namespace: string; similarity: number }> = [];
    let contextSnippets = [...clientSnippets];

    if (isKnowledgeRagEnabled() && userText && !structuredMode && hubRole !== "psm") {
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

    const isVenicePsmTee = hubRole === "psm" && provider === "venice";
    const isVeniceSupervisor =
      structuredMode === "supervisor" && provider === "venice";
    const requestedMaxTokens = isVeniceSupervisor
      ? PSM_SUPERVISOR_STRUCTURED_MAX_TOKENS
      : isVenicePsmTee
        ? 900
        : structuredMode
          ? 1000
          : 800;
    const model = resolvePsychatChatModel(hubRole, structuredMode);
    const hold = await reserveAiCredit({
      userId,
      model,
      inputText: input.map((message) => message.content).join("\n"),
      requestedMaxTokens,
    })

    let settled = false
    try {
      const completionOptions = isVenicePsmTee
        ? {
            model: VENICE_PSM_SUPERVISOR_TEE_MODEL,
            temperature: structuredMode === "supervisor" ? 0.55 : 0.65,
            max_tokens: hold.maxTokens,
            venice_parameters: getVeniceSupervisorTeeParameters(),
          }
        : {
            model: getAIModel(),
            temperature: 0.7,
            max_tokens: hold.maxTokens,
            ...(structuredMode && provider === "openai"
              ? { response_format: responseFormatForMode(structuredMode) }
              : {}),
          };

      const result = await createReliableChatCompletion(client, input, {
        ...completionOptions,
        singleAttempt: structuredMode === null,
      })
      await settleAiCredit(hold.chargeId, {
        model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      })
      settled = true
      const credit = await getCreditSnapshot(userId)

      if (structuredMode) {
        const fields = structuredFieldsFromCompletion(structuredMode, result)
        if (!fields) {
          return structuredOutputFailure(hubRole, structuredMode)
        }

        return NextResponse.json({
          ...fields,
          mode: structuredMode === "supervisor" ? "supervisor_report" : "exploracion",
          psychatHubRole: hubRole,
          ...(structuredMode === "exploracion" ? { handoffSuggested: true } : {}),
          ragSources,
          credit,
          creditNote: formatCreditNote(credit),
        })
      }

      if (hubRole === "psm" && result.text === SHORT_INPUT_FALLBACK) {
        return NextResponse.json(
          {
            error:
              "No se pudo generar una respuesta clínica en este intento. Reintenta en unos segundos; si persiste, avisa al equipo MotusDAO.",
            code: "psm_completion_unusable",
            psychatHubRole: hubRole,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        mode: hubRole === "psm" ? "supervisor_chat" : "qa",
        psychatHubRole: hubRole,
        text: result.text,
        ragSources,
        ragEnabled: hubRole !== "psm" && isKnowledgeRagEnabled(),
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
      if (/invalid request parameters/i.test(e.message)) {
        return NextResponse.json(
          {
            error:
              "El proveedor de IA rechazó la solicitud. Si usas Venice, reintenta en un momento; el Hub ya no envía parámetros incompatibles.",
          },
          { status: 502 }
        );
      }
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
