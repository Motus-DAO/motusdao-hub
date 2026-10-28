export const VENICE_HOME_URL = 'https://venice.ai/'
export const VENICE_PRIVACY_URL = 'https://docs.venice.ai/overview/privacy'

const CHAT_MODEL_LABELS: Record<string, string> = {
  'e2ee-deepseek-v4-flash': 'DeepSeek V4 Flash',
}

export function aiProcessingConsentCopy(providerLabel = 'Venice', mode: 'tee' | 'e2ee' = 'tee') {
  const transit =
    mode === 'e2ee'
      ? 'Este envío sale cifrado de este navegador. Motus no lee ese texto.'
      : 'El mensaje sale en claro en ese momento.'
  return `Acepto que ${providerLabel} procese lo que escribo aquí. ${transit} Confirmo que no mando una nota clínica, ni un expediente, y no es una emergencia. Las emergencias se revisan con humanos.`
}

export function chatModelLabel(modelId: string | null | undefined) {
  if (!modelId) return null
  return CHAT_MODEL_LABELS[modelId] ?? modelId
}

/** One-line footer under Psychat input — positive framing, no model name. */
export function psychatPrivacyTeaser(mode: 'tee' | 'e2ee') {
  if (mode === 'e2ee') {
    return 'Modo reforzado: tu mensaje sale cifrado desde este navegador; Motus reenvía bloques cifrados al proveedor de IA.'
  }
  return 'Modo estándar: tu consulta se procesa en un entorno protegido (TEE) del proveedor de IA. Puedes activar cifrado reforzado abajo.'
}
