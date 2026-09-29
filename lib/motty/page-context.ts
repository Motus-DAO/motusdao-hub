import type { MottyLocale } from '@/lib/motty/types'

export type MottyPageSurface =
  | 'home'
  | 'motusai'
  | 'academia'
  | 'pagos'
  | 'perfil'
  | 'psicoterapia'
  | 'registro'
  | 'docs'
  | 'default'

export type MottyPageCopy = {
  title: string
  subtitle: string
  greeting: string
  disclaimer: string
  placeholder: string
}

type PageCopySet = Record<MottyPageSurface, MottyPageCopy>

const PAGE_COPY: Record<MottyLocale, PageCopySet> = {
  es: {
    home: {
      title: 'Motty · Hub',
      subtitle: 'Tu asistente en esta página',
      greeting:
        'Hola. Soy Motty, tu asistente personal en el Hub. ¿En qué te puedo ayudar desde el inicio?',
      disclaimer:
        'Orientación general del Hub. No es MotusAI, terapia ni diagnóstico clínico.',
      placeholder: '¿En qué te ayudo en el Hub?',
    },
    motusai: {
      title: 'Motty · MotusAI',
      subtitle: 'Te ayudo a entender esta página',
      greeting:
        'Estás en MotusAI. Yo soy Motty (acompañamiento de ruta): te explico para qué sirve esta pantalla y cómo usarla. MotusAI es el chat de abajo; yo no lo reemplazo.',
      disclaimer:
        'Guía sobre la página MotusAI. No sustituye el chat MotusAI ni supervisión clínica.',
      placeholder: '¿Qué quieres entender de MotusAI?',
    },
    academia: {
      title: 'Motty · Academia',
      subtitle: 'Acompañamiento en la ruta PSM',
      greeting:
        'Estás en Academia. Te acompaño con la ruta (Génesis, Fundamentos, Praxis…), progreso e inscripciones. ¿Por dónde quieres empezar?',
      disclaimer:
        'Orientación de Academia en el Hub. No es terapia ni diagnóstico clínico.',
      placeholder: 'Pregunta sobre la ruta o un curso…',
    },
    pagos: {
      title: 'Motty · Pagos',
      subtitle: 'Te oriento en esta página de pagos',
      greeting:
        'Estás en Pagos. Puedo orientarte sobre cómo se usan los pagos en MotusDAO a alto nivel. No proceso transacciones ni veo saldos confidenciales desde aquí.',
      disclaimer:
        'Orientación general de pagos. No ejecuta cobros ni sustituye el flujo de checkout.',
      placeholder: 'Pregunta sobre pagos o membresía…',
    },
    perfil: {
      title: 'Motty · Perfil',
      subtitle: 'Te ayudo con tu perfil en el Hub',
      greeting:
        'Estás en Perfil. Puedo orientarte sobre qué completar y por qué importa para la ruta y el Hub. No edito tu perfil por ti.',
      disclaimer:
        'Orientación de perfil. No modifica datos ni sustituye el formulario.',
      placeholder: 'Pregunta sobre tu perfil…',
    },
    psicoterapia: {
      title: 'Motty · Psicoterapia',
      subtitle: 'Te ayudo a entender esta sección',
      greeting:
        'Estás en Psicoterapia. Te explico cómo encaja esta área en MotusDAO. No atiendo pacientes ni hago matching clínico desde este chat.',
      disclaimer:
        'Orientación de producto. No es consulta clínica ni matching terapéutico.',
      placeholder: '¿Qué quieres saber de esta sección?',
    },
    registro: {
      title: 'Motty · Registro',
      subtitle: 'Te oriento en el registro profesional',
      greeting:
        'Estás en Registro. Te ayudo a entender los pasos del ingreso profesional. Completar el registro no garantiza aprobación al Portal.',
      disclaimer:
        'Orientación del proceso de registro. No garantiza aprobación ni acceso al Portal.',
      placeholder: 'Pregunta sobre el registro…',
    },
    docs: {
      title: 'Motty · Docs',
      subtitle: 'Te ayudo a navegar la documentación',
      greeting:
        'Estás en Documentación. Dime qué buscas y te oriento hacia el recurso adecuado del Hub.',
      disclaimer:
        'Orientación de documentación. Verifica siempre la fuente canónica.',
      placeholder: '¿Qué documentación buscas?',
    },
    default: {
      title: 'Motty · Acompañamiento',
      subtitle: 'Acompañamiento Personalizado Digital en el Hub',
      greeting:
        'Soy Motty. Te acompaño en el Hub: preguntas a tu ritmo y orientación según la página en la que estás. No sustituyo supervisión humana ni MotusAI.',
      disclaimer:
        'Orientación en el Hub autenticado. No es MotusAI, terapia ni diagnóstico clínico.',
      placeholder: '¿En qué te ayudo en esta página?',
    },
  },
  en: {
    home: {
      title: 'Motty · Hub',
      subtitle: 'Your assistant on this page',
      greeting:
        'Hi. I am Motty, your personal assistant in the Hub. How can I help from home?',
      disclaimer:
        'General Hub guidance. Not MotusAI, therapy, or clinical diagnosis.',
      placeholder: 'How can I help in the Hub?',
    },
    motusai: {
      title: 'Motty · MotusAI',
      subtitle: 'I help you understand this page',
      greeting:
        'You are on MotusAI. I am Motty (route accompaniment): I explain what this screen is for. MotusAI is the chat below; I do not replace it.',
      disclaimer:
        'Guidance about the MotusAI page. Does not replace MotusAI chat or clinical supervision.',
      placeholder: 'What do you want to understand about MotusAI?',
    },
    academia: {
      title: 'Motty · Academy',
      subtitle: 'Accompaniment on the PSM route',
      greeting:
        'You are in Academy. I can help with the route (Genesis, Fundamentos, Praxis…), progress, and enrollments. Where do you want to start?',
      disclaimer:
        'Academy guidance in the Hub. Not therapy or clinical diagnosis.',
      placeholder: 'Ask about the route or a course…',
    },
    pagos: {
      title: 'Motty · Payments',
      subtitle: 'I orient you on this payments page',
      greeting:
        'You are on Payments. I can explain how payments work in MotusDAO at a high level. I do not process transactions from here.',
      disclaimer:
        'General payments guidance. Does not run checkout or charges.',
      placeholder: 'Ask about payments or membership…',
    },
    perfil: {
      title: 'Motty · Profile',
      subtitle: 'I help with your Hub profile',
      greeting:
        'You are on Profile. I can explain what to complete and why it matters. I do not edit your profile for you.',
      disclaimer:
        'Profile guidance. Does not change your data or replace the form.',
      placeholder: 'Ask about your profile…',
    },
    psicoterapia: {
      title: 'Motty · Psychotherapy',
      subtitle: 'I help you understand this section',
      greeting:
        'You are in Psychotherapy. I can explain how this area fits MotusDAO. I do not treat patients or do clinical matching here.',
      disclaimer:
        'Product guidance. Not clinical care or therapist matching.',
      placeholder: 'What do you want to know about this section?',
    },
    registro: {
      title: 'Motty · Registration',
      subtitle: 'I orient you on professional registration',
      greeting:
        'You are on Registration. I can explain the professional intake steps. Completing registration does not guarantee Portal approval.',
      disclaimer:
        'Registration process guidance. Does not guarantee approval or Portal access.',
      placeholder: 'Ask about registration…',
    },
    docs: {
      title: 'Motty · Docs',
      subtitle: 'I help you navigate documentation',
      greeting:
        'You are in Docs. Tell me what you need and I will point you to the right Hub resource.',
      disclaimer:
        'Documentation guidance. Always verify the canonical source.',
      placeholder: 'What documentation are you looking for?',
    },
    default: {
      title: 'Motty · Accompaniment',
      subtitle: 'Digital personalized accompaniment in the Hub',
      greeting:
        'I am Motty. I accompany you in the Hub according to the page you are on. I do not replace human supervision or MotusAI.',
      disclaimer:
        'Guidance in the authenticated Hub. Not MotusAI, therapy, or clinical diagnosis.',
      placeholder: 'How can I help on this page?',
    },
  },
}

/** Map Hub pathname → Motty surface (UI + prompt context). */
export function resolveMottyPageSurface(pathname: string | null | undefined): MottyPageSurface {
  const path = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/'

  if (path === '/') return 'home'
  if (path === '/motusai' || path.startsWith('/motusai/')) return 'motusai'
  if (path === '/academia' || path.startsWith('/academia/')) return 'academia'
  if (path === '/pagos' || path.startsWith('/pagos/')) return 'pagos'
  if (path === '/perfil' || path.startsWith('/perfil/')) return 'perfil'
  if (path === '/psicoterapia' || path.startsWith('/psicoterapia/')) return 'psicoterapia'
  if (path === '/registro' || path.startsWith('/registro/')) return 'registro'
  if (path === '/docs' || path.startsWith('/docs/')) return 'docs'
  if (path === '/onboarding' || path.startsWith('/onboarding/')) return 'registro'
  if (path === '/motus-names' || path.startsWith('/motus-names/')) return 'default'

  return 'default'
}

export function mottyPageCopy(
  locale: MottyLocale,
  surface: MottyPageSurface
): MottyPageCopy {
  return PAGE_COPY[locale][surface]
}

/** Safe path token for server prompt — never trust client claims beyond pathname shape. */
export function sanitizeMottyPagePath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('/')) return null
  if (trimmed.length > 120) return null
  if (!/^\/[a-zA-Z0-9/_-]*$/.test(trimmed)) return null
  return trimmed
}
