import type { MottyLocale } from '@/lib/motty/types'

const COPY = {
  es: {
    title: 'Motty · Acompañamiento',
    subtitle: 'Acompañamiento Personalizado Digital en la Academia',
    greeting:
      'Soy Motty. Te acompaño en la Academia: preguntas a tu ritmo, orientación en la ruta y conexión con recursos del Hub. No sustituyo supervisión humana ni MotusAI.',
    disclaimer:
      'Orientación de ruta en el Hub autenticado. No es MotusAI, terapia ni diagnóstico clínico.',
    crisis:
      'Si hay riesgo inmediato, contacta servicios de emergencia locales. MotusDAO no es atención de crisis.',
    placeholder: 'Pregunta sobre la ruta, Fundamentos o el Hub…',
    thinking: 'Pensando…',
    send: 'Enviar',
    close: 'Cerrar chat',
    fab: 'Abrir Motty',
    error: 'No pude responder. Intenta de nuevo.',
    rateLimit: 'Demasiados mensajes. Espera un momento.',
  },
  en: {
    title: 'Motty · Accompaniment',
    subtitle: 'Digital personalized accompaniment in Academy',
    greeting:
      'I am Motty. I accompany you on the Academy route: questions at your pace, orientation, and Hub resources. I do not replace human supervision or MotusAI.',
    disclaimer:
      'Route guidance in the authenticated Hub. Not MotusAI, therapy, or clinical diagnosis.',
    crisis:
      'If there is immediate risk, contact local emergency services. MotusDAO is not crisis care.',
    placeholder: 'Ask about the route, Fundamentos, or the Hub…',
    thinking: 'Thinking…',
    send: 'Send',
    close: 'Close chat',
    fab: 'Open Motty',
    error: 'I could not reply. Try again.',
    rateLimit: 'Too many messages. Wait a moment.',
  },
} as const

export function mottyCopy(locale: MottyLocale) {
  return COPY[locale]
}

export const MOTTY_DEFAULT_LOCALE: MottyLocale = 'es'
