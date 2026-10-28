export const TRAINING_COPY_POLICY_VERSION = '2026-10-28-training-v1' as const

export const TRAINING_COPY_MIN_CHARS = 80
export const TRAINING_COPY_MAX_CHARS = 12000

export const TRAINING_COMPENSATION_USD_OPTIONS = [0, 5, 10] as const
export type TrainingCompensationUsd = (typeof TRAINING_COMPENSATION_USD_OPTIONS)[number]

export const trainingCopyNotice = {
  processor:
    'MotusDAO y el procesador de entrenamiento que designemos (p. ej. proveedor de modelos o socio de investigación autorizado).',
  purpose:
    'Entrenar o evaluar modelos de lenguaje con texto que tú eliges liberar en claro, separado de Psychat, bitácora cifrada y expediente.',
  retention:
    'Mientras tu consentimiento esté activo y el plazo mínimo de auditoría/legal lo exija. Revocar detiene usos futuros.',
  cannotUntrain:
    'Un modelo ya entrenado no se “desentrena”. Revocar evita nuevos usos de esta copia, no borra pesos existentes.',
  reidentification:
    'Un relato sensible más un pago a tu wallet puede re-identificarte. El monto registrado no significa anonimato.',
  careUnchanged:
    'Psychat, tu match y tus sesiones siguen igual si dices no. Esto no es condición para recibir atención.',
} as const

export const trainingCopySubmitLead =
  'Escribo yo este texto en claro, solo para entrenamiento. No es export automático de Psychat ni de mi bitácora cifrada.'
