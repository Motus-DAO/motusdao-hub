import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePsychatRole, resolvePsychatStructuredMode } from './psychat-prompt'
import {
  parseStructuredOutput,
  validateStructuredPayload,
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

  it('psm hub role resolves to supervisor mode', () => {
    assert.equal(resolvePsychatStructuredMode('psm', 'caso anonimizado'), 'supervisor')
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
})
