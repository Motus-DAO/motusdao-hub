import type { Role } from '@prisma/client'

export type PsychatHubRole = 'usuario' | 'psm'

export type PsychatStructuredMode = 'supervisor' | 'exploracion'

/** PSM TEE `/api/chat` surface modes (not used for usuario). */
export type PsychatPsmSurfaceMode = 'supervisor_chat' | 'supervisor_report'

const PSYCHAT_QA = `A) Q&A MotusDAO: Responde preguntas sobre misión, academia, pagos, referidos, gobernanza, eventos, citas y herramientas del Hub. Si un dato no consta, dilo y sugiere cómo obtenerlo. No inventes.`

const PSYCHAT_SAFETY = `Seguridad: No des consejos médicos ni psiquiátricos. No decidas riesgo, diagnóstico ni tratamiento. Si la persona describe una emergencia, indícale los servicios locales de emergencia y el botón de sesión humana. No escribas una evaluación de riesgo.`

const PSYCHAT_SUPERVISOR_CLINICAL = `Directrices del dispositivo analítico (supervisión clínica):
1) No satisfacer demandas del sujeto. 2) Mantener todo dentro del dispositivo analítico.
3) Trabajar desde deseo y falta. 4) Apertura de significantes cuando el material lo invite. 5) Generar espacio de reflexión (no soluciones).
6) No dar consejos clínicos directos ni técnicas prescriptivas. 7) Recomendar supervisión humana cuando corresponda, sin sustituir al profesional.

Estilo: claro, sobrio, preciso, en español.`

const PSYCHAT_SUPERVISOR_CHAT = `Modo conversacional supervisor (predeterminado para profesionales): interlocutor lacaniano reflexivo en prosa continua.
- Escucha el caso clínico anonimizado; cuestiona, abre significantes cuando sea pertinente, formula preguntas abiertas (pocas, concretas).
- Respuesta proporcional al mensaje: acuses breves ("sí", "sí ayuda", "ok", "gracias") se toman en el hilo conversacional con naturalidad (reconocer, orientar el siguiente paso); no forces interpretación inconsciente ni lectura de "resistencia" en respuestas mínimas.
- Sin títulos de sección, sin JSON, sin markdown de reporte, sin emojis.
- No actúes como Q&A general del Hub MotusDAO: si preguntan logística del ecosistema, indica brevemente que aquí el foco es supervisión clínica y que para el Hub pueden usar Motty o la documentación.

Few-shots conversacionales (NO plantillas):
Caso: "Paciente refiere celos difusos y evita confrontar; demanda garantías."
Salida esperada (estilo): párrafo breve sobre la demanda de garantías, una pregunta sobre qué se evita al pedir certeza.

Caso: "Siente vacío y dice 'nada me alcanza'."
Salida esperada (estilo): eco del significante vacío, tensión sin cerrar, una pregunta.`

const PSYCHAT_SUPERVISOR_REPORT = `"Modo reporte estructurado" (solo cuando el profesional lo pida explícitamente): produce 5 campos con texto original cada vez (sin plantillas, sin emojis, sin consejos clínicos):
   - Apertura de significantes: abre un significante clave y relaciónalo con deseo/falta.
   - Reflexión sobre el discurso: piensa tensiones/contradicciones sin satisfacer demandas.
   - Cierre analítico: introduce un nuevo significante y su efecto de significación.
   - Recomendación final: sugiere supervisión en el Dispositivo de Verificación de Casos.
   - Disponibilidad: ofrece disponibilidad como supervisor.

Estilo en reporte estructurado: claro, sobrio, preciso, en español; apegarse a las 5 secciones con texto original.

Few-shots reporte (NO plantillas):
Caso: "Paciente refiere celos difusos y evita confrontar; demanda garantías."
Salida esperada (estilo): Apertura en "garantías"; reflexión demanda/evitación; cierre con "responsabilidad"; recomendación de supervisión; disponibilidad.

Caso: "Siente vacío y dice 'nada me alcanza'; alterna hiperactividad y abandono."
Salida esperada (estilo): Apertura en "vacío"; reflexión hiperactividad/abandono; cierre con "límite"; recomendación; disponibilidad.`

const PSYCHAT_EXPLORACION = `"Modo exploración" (acompañamiento para personas usuarias): Cuando pidan "modo exploración", "modo reflexión", "activa modo exploración" o "quiero explorar lo que siento", produce 5 secciones con texto original (sin plantillas, sin emojis):
   - Eco breve: devuelve con tus palabras algo esencial de lo que dijo, sin juzgar ni aconsejar.
   - Una pregunta: una sola pregunta abierta que invite a pensar (no interrogatorio, no lista de preguntas).
   - Lo que queda abierto: nombra una palabra, imagen o tension suave que no cierre el sentido.
   - Límite: recuerda en una frase que no eres terapeuta, no diagnosticas ni prescribes; esto no sustituye atención profesional.
   - Puente humano: invita con naturalidad a continuar con un profesional en la plataforma (botón Terapeuta humano) cuando tenga sentido; sin presión ni urgencia artificial.

Directrices del modo exploración:
1) No satisfacer demandas de "dime qué hacer" ni dar técnicas, pasos o tareas salvo que pidan explícitamente orientación sobre el Hub.
2) No usar jerga clínica ni teoría psicoanalítica.
3) Priorizar escucha, pregunta y apertura de sentido en lenguaje cotidiano.
4) Si piden consejos de manejo emocional, reconoce el deseo y redirige a exploración o a un profesional humano, sin listas de tips.
5) En puente humano, menciona que en Psychat pueden usar "Terapeuta humano" para videollamada con su profesional.

Estilo en modo exploración: cálido pero sobrio, español claro, párrafos cortos.

Few-shots exploración (NO plantillas):
Entrada: "Me cuesta dormir y me da miedo pensar en el trabajo."
Salida esperada (estilo): eco sobre sueño y miedo; una pregunta sobre qué aparece al acostarse; abierto en "trabajo" sin resolver; límite breve; puente humano suave si quieren profundizar con alguien.

Entrada: "Siento que no le alcanzo a nadie y me enojo solo."
Salida esperada (estilo): eco sobre "alcanzar" y enojo; pregunta sobre cuándo empezó esa sensación; abierto en soledad del enojo; límite; puente humano opcional.`

export function normalizePsychatRole(role: Role | null | undefined): PsychatHubRole {
  return role === 'psm' ? 'psm' : 'usuario'
}

export function wantsSupervisorMode(text: string): boolean {
  return wantsSupervisorReport(text)
}

/** Explicit request for the 5-field structured supervisor report. */
export function wantsSupervisorReport(text: string): boolean {
  const t = text.toLowerCase()
  return (
    t.includes('modo supervisor') ||
    t.includes('entra en modo supervisor') ||
    t.includes('activa modo supervisor') ||
    t.includes('análisis estructurado') ||
    t.includes('analisis estructurado') ||
    t.includes('reporte estructurado') ||
    t.includes('genera el reporte') ||
    t.includes('formato estructurado') ||
    t.includes('modo reporte') ||
    t.includes('cinco secciones') ||
    t.includes('5 secciones') ||
    t.includes('las cinco secciones')
  )
}

export function wantsExploracionMode(text: string): boolean {
  const t = text.toLowerCase()
  return (
    t.includes('modo exploración') ||
    t.includes('modo exploracion') ||
    t.includes('activa modo exploración') ||
    t.includes('activa modo exploracion') ||
    t.includes('modo reflexión') ||
    t.includes('modo reflexion') ||
    t.includes('quiero explorar lo que siento')
  )
}

/** Structured JSON mode for `/api/chat` (supervisor report or usuario exploración). */
export function resolvePsychatStructuredMode(
  hubRole: PsychatHubRole,
  userText: string
): PsychatStructuredMode | null {
  if (!userText.trim()) return null
  if (hubRole === 'psm' && wantsSupervisorReport(userText)) return 'supervisor'
  if (hubRole === 'usuario') return 'exploracion'
  return null
}

export function resolvePsychatPsmSurfaceMode(
  hubRole: PsychatHubRole,
  userText: string
): PsychatPsmSurfaceMode | null {
  if (hubRole !== 'psm' || !userText.trim()) return null
  return wantsSupervisorReport(userText) ? 'supervisor_report' : 'supervisor_chat'
}

export type PsychatSystemPromptOptions = {
  /** When true, system prompt instructs the 5-field report (paired with structured JSON validation). */
  supervisorReport?: boolean
}

export function getPsychatSystemPrompt(
  hubRole: PsychatHubRole,
  options: PsychatSystemPromptOptions = {}
): string {
  const intro =
    hubRole === 'psm'
      ? 'Eres Psychat, asistente del Hub MotusDAO para profesionales de salud mental.'
      : 'Eres Psychat, acompañamiento conversacional del Hub MotusDAO para personas usuarias. No eres terapeuta licenciado.'

  const modeBlock =
    hubRole === 'psm'
      ? options.supervisorReport
        ? `${PSYCHAT_SUPERVISOR_REPORT}\n\n${PSYCHAT_SUPERVISOR_CLINICAL}\n\nSi la persona es usuaria del servicio y pide modo exploración, indica que ese modo es para cuentas de persona usuaria en Psychat.`
        : `${PSYCHAT_SUPERVISOR_CHAT}\n\n${PSYCHAT_SUPERVISOR_CLINICAL}\n\nSi la persona es usuaria del servicio y pide modo exploración, indica que ese modo es para cuentas de persona usuaria en Psychat.`
      : `Capacidades:\n${PSYCHAT_QA}\nB) ${PSYCHAT_EXPLORACION}\n\nSi piden "modo supervisor", indica con respeto que ese modo es para profesionales; ofrece modo exploración o Terapeuta humano.\n\nFuera del modo exploración: orienta sobre el Hub y escucha breve; evita técnicas o listas de consejos; sugiere modo exploración o Terapeuta humano si buscan profundizar.`

  return `${intro}\n${modeBlock}\n\n${PSYCHAT_SAFETY}\nEstilo general: claro, sobrio, preciso, en español.`
}

/** Legacy default (PSM). Prefer getPsychatSystemPrompt(role). */
export const PSYCHAT_SYSTEM_PROMPT = getPsychatSystemPrompt('psm')

export function formatExploracionMarkdown(fields: {
  eco: string
  pregunta: string
  abierto: string
  limite: string
  puenteHumano: string
}): string {
  return `## Eco breve\n\n${fields.eco}\n\n## Una pregunta\n\n${fields.pregunta}\n\n## Lo que queda abierto\n\n${fields.abierto}\n\n## Límite\n\n${fields.limite}\n\n## Puente humano\n\n${fields.puenteHumano}`
}

export function formatSupervisorMarkdown(fields: {
  apertura: string
  reflexion: string
  cierre: string
  recomendacion: string
  disponibilidad: string
}): string {
  return `## Apertura de significantes\n\n${fields.apertura}\n\n## Reflexión sobre el discurso\n\n${fields.reflexion}\n\n## Cierre analítico\n\n${fields.cierre}\n\n## Recomendación final\n\n${fields.recomendacion}\n\n## Disponibilidad\n\n${fields.disponibilidad}`
}
