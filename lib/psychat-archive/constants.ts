export const PSYCHAT_ARCHIVE_PURPOSE = 'motus-psychat-archive' as const
export const PSYCHAT_ARCHIVE_KEY_VERSION = 1 as const
export const PSYCHAT_ARCHIVE_PAYLOAD_VERSION = 1 as const
export const PSYCHAT_ARCHIVE_EXPORT_FORMAT = 'motus-psychat-archive-export' as const
export const PSYCHAT_ARCHIVE_EXPORT_VERSION = 1 as const

/** Browser event: sidebar/listeners refetch archive metadata after PUT/DELETE. */
export const PSYCHAT_ARCHIVE_CHANGED_EVENT = 'motus-psychat-archive-changed' as const

export const psychatArchiveOptInCopy =
  'Guardar una copia cifrada de este chat en mi cuenta Motus (opcional; apagado por defecto). El equipo de la app no puede leer el texto — solo tú, con tu wallet.'

/** Plain-language labels (avoid “servidor” with clinicians). */
export const psychatCopy = {
  accountBackup: 'Copia en tu cuenta Motus',
  noAccountBackup: 'Sin copia guardada en tu cuenta.',
  singleAccountSnapshotHint:
    'En tu cuenta hay una sola copia: cada guardado la reemplaza. Los .json locales solo viven en “En pantalla” hasta que los vuelvas a abrir.',
  deleteAccountBackup: 'Borrar copia de mi cuenta',
  savedToAccount: 'Copia cifrada guardada en tu cuenta Motus.',
  saveToAccount: 'Guardar en mi cuenta Motus',
  recoverFromJson: 'Recuperar desde archivo .json',
  notAnotherWebsite:
    'No es otro sitio ni un expediente clínico: es el respaldo cifrado ligado a tu cuenta en Motus Hub (esta app).',
} as const
