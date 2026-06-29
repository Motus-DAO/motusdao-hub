import { NextRequest, NextResponse } from "next/server";
import { getAIClient, getAIModel, getAIProvider, hasAIKey } from "@/lib/ai-client";
import { isKnowledgeRagEnabled, retrieveMotusContext } from "@/lib/motus-knowledge";

const SYSTEM_PROMPT = `Eres el Asistente Oficial de MotusDAO.
Capacidades:
A) Q&A MotusDAO: Responde preguntas sobre misión, academia, pagos, referidos, gobernanza, eventos. Si un dato no consta, dilo y sugiere cómo obtenerlo. No inventes.
B) "Modo Supervisor" (verificación de caso): Cuando el usuario pida "modo supervisor" o equivalente, produce 5 secciones con texto original cada vez (sin plantillas, sin emojis, sin consejos clínicos):
   - Apertura de significantes: abre un significante clave y relaciónalo con deseo/falta.
   - Reflexión sobre el discurso: piensa tensiones/contradicciones sin satisfacer demandas.
   - Cierre analítico: introduce un nuevo significante y su efecto de significación.
   - Recomendación final: sugiere supervisión en el Dispositivo de Verificación de Casos.
   - Disponibilidad: ofrece disponibilidad como supervisor.

Directrices del análisis:
1) No satisfacer demandas del sujeto. 2) Mantener todo dentro del dispositivo analítico.
3) Trabajar desde deseo y falta (¬ϕ(x), D). 4) Ciclo lógico: ∃x¬ϕ(x)→∀xϕ(x)→¬∀xϕ(x)→¬∃x¬ϕ(x)→∃x¬ϕ(x).
5) Apertura y cierre de significantes. 6) Generar espacio de reflexión (no soluciones).
7) Recomendar supervisión. 8) Ofrecer disponibilidad.

Medios de la dirección de la cura (síntesis operativa):
- No se satisfacen demandas; se abre camino a la confesión del deseo.
- La resistencia aparece como incompatibilidad del deseo con la palabra.
- La angustia puede señalar el deseo y abrir el discurso al nivel de los significantes.

Seguridad: No des consejos médicos/psiquiátricos. Deriva a profesionales cuando corresponda.
Estilo: Claro, sobrio, preciso, en español. En "modo supervisor", apegarse a las 5 secciones con texto original.

Few-shots (añadir tal cual al system, al final)
[EJEMPLO 1 — entrada breve de caso]
Caso: "Paciente refiere celos difusos y evita confrontar; demanda garantías."
Salida esperada (resumen de estilo, NO plantilla): Apertura centrada en "garantías"; reflexión sobre demanda/evitación; cierre con nuevo significante "responsabilidad"; recomendación de supervisión; disponibilidad.

[EJEMPLO 2 — entrada breve de caso]
Caso: "Siente vacío y dice 'nada me alcanza'; alterna hiperactividad y abandono."
Salida esperada: Apertura en "vacío"; reflexión tensiones hiperactividad/abandono; cierre con "límite"; recomendación; disponibilidad.`;

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

function wantsSupervisorMode(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("modo supervisor") || t.includes("entra en modo supervisor") || t.includes("activa modo supervisor");
}

export async function POST(req: NextRequest) {
  if (!hasAIKey()) {
    return NextResponse.json({ error: `Missing ${getAIProvider() === 'venice' ? 'VENICE_INFERENCE_KEY' : 'OPENAI_API_KEY'}` }, { status: 401 });
  }

  try {
    const client = getAIClient();
    const body = await req.json();
    const userMessages = (body?.messages || []) as {role:"user"|"assistant"|"system", content:string}[];
    const clientSnippets = (body?.contextSnippets || []) as string[];

    if (!userMessages || !Array.isArray(userMessages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Construir conversación
    const input: Array<{ role: "system" | "assistant" | "user"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Tomar el último mensaje de usuario para rutear modo
    const lastUser = userMessages.slice().reverse().find(m => m.role === "user");
    const userText = lastUser?.content || "";

    let ragSources: Array<{ sourcePath: string; title: string; namespace: string; similarity: number }> = [];
    let contextSnippets = [...clientSnippets];

    if (isKnowledgeRagEnabled() && userText && !wantsSupervisorMode(userText)) {
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
    }

    if (contextSnippets.length) {
      input.push({ 
        role: "assistant", 
        content: `Contexto verificado (no inventar fuera de esto):\n${contextSnippets.join("\n---\n")}` 
      });
    }

    // Tomar el último mensaje de usuario para rutear modo — userText already computed above
    // Agregar mensajes de usuario con tipos correctos
    userMessages.forEach(msg => {
      input.push({ role: msg.role as "system" | "assistant" | "user", content: msg.content });
    });

    if (wantsSupervisorMode(userText)) {
      const r = await client.chat.completions.create({
        model: getAIModel(),
        messages: input,
        response_format: SUPERVISOR_SCHEMA,
        temperature: 0.7,
        max_tokens: 1000
      });

      // Extraer contenido schema
      const text = r.choices[0]?.message?.content ?? "{}";
      let json;
      try { 
        json = JSON.parse(text); 
      } catch { 
        json = {
          apertura: "Error en el análisis",
          reflexion: "No se pudo procesar la respuesta",
          cierre: "Reintentar el análisis",
          recomendacion: "Contactar soporte técnico",
          disponibilidad: "Disponible para nueva consulta"
        }; 
      }

      return NextResponse.json({ mode: "supervisor", ...json, ragSources });
    }

    // Q&A normal
    const r = await client.chat.completions.create({
      model: getAIModel(),
      messages: input,
      temperature: 0.7,
      max_tokens: 800
    });

    const answer = r.choices[0]?.message?.content?.trim() || "";
    return NextResponse.json({ mode: "qa", text: answer, ragSources, ragEnabled: isKnowledgeRagEnabled() });

  } catch (e: unknown) {
    console.error('OpenAI API Error:', e);
    
    // Handle specific OpenAI errors
    if (e instanceof Error) {
      if (e.message.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' },
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

    return NextResponse.json({ error: (e as Error)?.message || "OpenAI error" }, { status: 500 });
  }
}
