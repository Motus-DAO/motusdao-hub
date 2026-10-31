import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePsychatRole, resolvePsychatStructuredMode } from './psychat-prompt'
import {
  parseStructuredOutput,
  validateStructuredPayload,
  extractPsychatStructuredFields,
  PSYCHAT_STRUCTURED_OUTPUT_ERROR,
} from './psychat-structured-output'

describe('psychat structured output', () => {
  it('usuario hub role resolves to exploracion mode', () => {
    assert.equal(normalizePsychatRole('usuario'), 'usuario')
    assert.equal(
      resolvePsychatStructuredMode('usuario', 'hoy me pelee con mi papa y estoy triste'),
      'exploracion'
    )
  })

  it('psm hub role uses structured supervisor only when API requests report', () => {
    assert.equal(resolvePsychatStructuredMode('psm', 'caso anonimizado'), null)
    assert.equal(
      resolvePsychatStructuredMode('psm', 'caso anonimizado', { requestStructuredReport: true }),
      'supervisor'
    )
  })

  it('parses exploracion JSON from Venice-style fenced output', () => {
    const raw = `\`\`\`json
{"eco":"Escucho tristeza después de la pelea.","pregunta":"¿Qué fue lo más difícil de decir?","abierto":"pelea","limite":"No soy terapeuta.","puenteHumano":"Puedes usar Terapeuta humano si quieres."}
\`\`\``
    const parsed = parseStructuredOutput(raw)
    const fields = validateStructuredPayload('exploracion', parsed)
    assert.ok(fields)
    assert.equal(fields && 'eco' in fields ? fields.eco.includes('tristeza') : false, true)
  })

  it('rejects supervisor-shaped JSON when exploracion was requested', () => {
    const parsed = parseStructuredOutput(
      JSON.stringify({
        mode: 'supervisor',
        apertura: 'Error en el análisis',
        reflexion: 'No se pudo procesar la respuesta',
        cierre: 'Reintentar',
        recomendacion: 'Contactar soporte',
        disponibilidad: 'Disponible',
      })
    )
    assert.equal(validateStructuredPayload('exploracion', parsed), null)
  })

  it('does not treat error copy as valid structured content', () => {
    assert.match(PSYCHAT_STRUCTURED_OUTPUT_ERROR, /Intenta de nuevo/)
  })

  it('extracts supervisor fields from markdown sections (Venice-style)', () => {
    const md = `## Apertura de significantes

El significante "celos" articula la demanda.

## Reflexión sobre el discurso

Tensión entre evitar y exigir garantías.

## Cierre analítico

La falta aparece como límite.

## Recomendación final

Supervisión en el dispositivo de verificación.

## Disponibilidad

Quedo disponible para continuar.`
    const fields = extractPsychatStructuredFields('supervisor', md)
    assert.ok(fields)
    assert.equal(fields && 'apertura' in fields ? fields.apertura.includes('celos') : false, true)
  })
})
