/** Chat-data slice 5 — where Psychat working context lives (RootRouter / enclave). */

export const ROOTROUTER_DEFAULT_PROXY_URL = 'http://127.0.0.1:8787'

export const PSYCHAT_CONTEXT_MODES = [
  'hub_default',
  'local_rootrouter',
  'session_enclave',
  'always_on_enclave',
] as const

export type PsychatContextMode = (typeof PSYCHAT_CONTEXT_MODES)[number]

export const psychatContextModeLabels: Record<PsychatContextMode, string> = {
  hub_default: 'Estándar (Hub)',
  local_rootrouter: 'Memoria local (RootRouter)',
  session_enclave: 'Sala de sesión (enclave)',
  always_on_enclave: 'Enclave siempre activo',
}

export const psychatContextModeShort: Record<PsychatContextMode, string> = {
  hub_default: 'Contexto en esta conversación; el Hub no guarda un archivo largo de Psychat.',
  local_rootrouter:
    'RootRouter en tu computadora guarda el contexto en store.json. Motus no indexa ese archivo.',
  session_enclave:
    'Proxy en un enclave efímero con attestation (beta). La sala se destruye al terminar.',
  always_on_enclave: 'Proxy privado 24/7 en enclave (próximamente; mayor costo).',
}

export const ROOTROUTER_UPSTREAM_PATH = '/api/chat/rootrouter-upstream'

export const PSYCHAT_CONTEXT_SETTINGS_KEY = 'motus-psychat-context-settings-v1'
