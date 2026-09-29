import type { MottyLocale } from '@/lib/motty/types'
import {
  mottyPageCopy,
  resolveMottyPageSurface,
  type MottyPageSurface,
} from '@/lib/motty/page-context'

const SHARED = {
  es: {
    crisis:
      'Si hay riesgo inmediato, contacta servicios de emergencia locales. MotusDAO no es atención de crisis.',
    thinking: 'Pensando…',
    send: 'Enviar',
    close: 'Cerrar chat',
    fab: 'Abrir Motty',
    error: 'No pude responder. Intenta de nuevo.',
    rateLimit: 'Demasiados mensajes. Espera un momento.',
  },
  en: {
    crisis:
      'If there is immediate risk, contact local emergency services. MotusDAO is not crisis care.',
    thinking: 'Thinking…',
    send: 'Send',
    close: 'Close chat',
    fab: 'Open Motty',
    error: 'I could not reply. Try again.',
    rateLimit: 'Too many messages. Wait a moment.',
  },
} as const

export function mottyCopy(
  locale: MottyLocale,
  surface: MottyPageSurface = 'default'
) {
  const page = mottyPageCopy(locale, surface)
  return {
    ...SHARED[locale],
    ...page,
  }
}

export function mottyCopyForPath(locale: MottyLocale, pathname: string | null) {
  return mottyCopy(locale, resolveMottyPageSurface(pathname))
}

export const MOTTY_DEFAULT_LOCALE: MottyLocale = 'es'
