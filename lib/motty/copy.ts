import type { MottyLocale } from '@/lib/motty/types'

export const MOTTY_DEFAULT_LOCALE: MottyLocale = 'es'

export function mottyCopy(locale: MottyLocale) {
  if (locale === 'en') {
    return {
      title: 'Motty · Digital personalized accompaniment',
      greeting:
        'I am Motty. I accompany you on the Academy route: questions at your pace, orientation, and links to Hub resources. I do not replace human supervision.',
      placeholder: 'Ask about Fundamentos, the route, or Hub tools…',
      send: 'Send',
      close: 'Close',
      open: 'Open Motty',
      error: 'Could not reply just now. Try again.',
    }
  }

  return {
    title: 'Motty · Acompañamiento Personalizado Digital',
    greeting:
      'Soy Motty. Te acompaño en la Academia: preguntas a tu ritmo, orientación en la ruta y conexión con recursos del Hub. No sustituyo supervisión humana.',
    placeholder: 'Pregunta sobre Fundamentos, la ruta o el Hub…',
    send: 'Enviar',
    close: 'Cerrar',
    open: 'Abrir Motty',
    error: 'No pude responder ahora. Intenta de nuevo.',
  }
}
