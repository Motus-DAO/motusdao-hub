import type { PrismaClient } from '@prisma/client'
import { upsertAcademyCourse, type SeedCourse } from './academy-seed-shared'

/** Bloque 02 — Fundamentos + Membresía de Práctica Digital. */
export const FUNDAMENTOS_COURSE: SeedCourse = {
  id: 'course_02_fundamentos',
  slug: '02-fundamentos',
  title: '02 — Fundamentos',
  summary:
    'Membresía de Práctica Digital: clínica digital, encuadre, ética, perfil profesional y recursos base (USD 20/mes · 120/año).',
  description: `Bloque **02 — Fundamentos** — producto **Membresía de Práctica Digital**.

Ordena tu transición hacia la práctica clínica digital: encuadre, ética, límites, perfil y acompañamiento comunitario.

**Referencia:** USD 20/mes o USD 120/año.

> No equivale a certificación externa ni garantiza acceso automático al Portal Clínico.`,
  category: 'Ruta PSM',
  difficulty: 'beginner',
  isPublished: true,
  isFree: false,
  priceAmount: 20,
  priceCurrency: 'USD',
  instructor: 'MotusDAO',
  instructorTitle: 'Academia de Psicología Digital',
  learningOutcomes: [
    'Dominar el lenguaje común de la clínica digital MotusDAO.',
    'Redactar encuadre mínimo para atención en línea.',
    'Identificar límites éticos, crisis y derivación.',
    'Construir perfil profesional coherente con la membresía.',
    'Activar la Membresía de Práctica Digital y preparar Praxis.',
  ],
  modules: [
    {
      id: 'module_02_fundamentos_clinica',
      title: 'Fundamentos de la clínica digital',
      summary: 'Lenguaje común, encuadre y límites éticos.',
      order: 1,
      lessons: [
        {
          id: 'lesson_02_fundamentos_intro',
          title: 'Lenguaje común de la clínica digital',
          slug: 'lenguaje-comun-clinica-digital',
          order: 1,
          duration: 20,
          isFreePreview: true,
          summary: 'Qué es Fundamentos y para quién es este bloque.',
          contentMDX: `# Lenguaje común de la clínica digital

Completaste **01 — Génesis**. Ahora entras a **02 — Fundamentos**, donde la **Membresía de Práctica Digital** te da estructura y acompañamiento.

Aquí construyes lenguaje común sobre encuadre, ética, límites, tecnología, privacidad y acompañamiento.

## Ruta de 5 bloques

\`\`\`
01 Génesis → 02 Fundamentos → 03 Praxis → 04 Validación → 05 Portal Clínico
\`\`\`

## Para quién es

Psicólogos que quieren ordenar su práctica clínica digital antes de talleres, supervisiones o el Portal.`,
        },
        {
          id: 'lesson_02_fundamentos_encuadre',
          title: 'Encuadre básico de atención en línea',
          slug: 'encuadre-basico-atencion-linea',
          order: 2,
          duration: 22,
          isFreePreview: true,
          summary: 'Espacio, tiempo, confidencialidad y presencia digital.',
          contentMDX: `# Encuadre básico de atención en línea

El encuadre define **cómo**, **cuándo**, **dónde** y **con qué límites** ocurre el acompañamiento.

## Elementos mínimos

- **Espacio** — privacidad razonable para profesional y persona.
- **Tiempo** — duración, horario, cancelaciones, zona horaria.
- **Confidencialidad** — quién puede escuchar o ver la sesión.
- **Presencia digital** — cámara, conexión inestable, qué hacer si se cae la llamada.

## Ejercicio

Redacta un borrador de encuadre mínimo (½ página) para compartir antes de una primera sesión en video.`,
        },
        {
          id: 'lesson_02_fundamentos_limites',
          title: 'Límites éticos y profesionales',
          slug: 'limites-eticos-profesionales',
          order: 3,
          duration: 18,
          isFreePreview: false,
          summary: 'Alcance, urgencia, derivación y responsabilidad.',
          contentMDX: `# Límites éticos y profesionales

- Define poblaciones y temas que sí atiendes y casos que derivas.
- Protocolo básico ante crisis e ideación.
- La formación MotusDAO **no** sustituye tu cédula ni tu juicio clínico.

Al completar este módulo estarás listo para ordenar tu perfil y activar la membresía.`,
        },
      ],
    },
    {
      id: 'module_02_fundamentos_perfil',
      title: 'Perfil y herramientas',
      summary: 'Presencia profesional y operación básica.',
      order: 2,
      lessons: [
        {
          id: 'lesson_02_fundamentos_perfil',
          title: 'Construir tu perfil profesional',
          slug: 'construir-perfil-profesional',
          order: 1,
          duration: 20,
          isFreePreview: false,
          summary: 'Narrativa, especialización y encuadre público.',
          contentMDX: `# Construir tu perfil profesional

1. **Narrativa** — quién eres y cómo acompañas (sin prometer resultados).
2. **Enfoque** — temas y poblaciones con honestidad sobre tu experiencia.
3. **Modalidad** — en MotusDAO la atención es por **video** (teleterapia).
4. **Encuadre visible** — urgencia, cancelaciones, confidencialidad.

Evita claims no sustentados: pacientes garantizados, certificación MotusDAO.`,
        },
        {
          id: 'lesson_02_fundamentos_herramientas',
          title: 'Herramientas digitales base',
          slug: 'herramientas-digitales-base',
          order: 2,
          duration: 16,
          isFreePreview: false,
          summary: 'Video, agenda, documentación y privacidad.',
          contentMDX: `# Herramientas digitales base

- Videollamada (Jitsi MotusDAO o consultorio digital).
- Agenda, recordatorios y política de cancelación.
- Notas clínicas con mínimos de seguridad.
- IA como apoyo — no sustituto del juicio clínico (profundizarás en **03 — Praxis**).`,
        },
      ],
    },
    {
      id: 'module_02_fundamentos_membresia',
      title: 'Membresía de Práctica Digital',
      summary: 'Qué incluye, límites y plan hacia Praxis.',
      order: 3,
      lessons: [
        {
          id: 'lesson_02_fundamentos_membresia-que-es',
          title: 'Qué incluye la membresía',
          slug: 'que-es-membresia-practica-digital',
          order: 1,
          duration: 18,
          isFreePreview: false,
          summary: 'Producto del bloque Fundamentos.',
          contentMDX: `# Membresía de Práctica Digital

La membresía es el **producto de este bloque** — no un bloque separado.

## Referencia de inversión

**USD 20/mes** o **USD 120/año**.

## Puede incluir

- Orientación y recursos base sobre práctica digital.
- Encuentros comunitarios y materiales de actualización.
- Acompañamiento para ordenar perfil y encuadre.

## Qué no entrega

Certificación oficial, licencia, garantía de pacientes ni acceso automático al Portal Clínico.`,
        },
        {
          id: 'lesson_02_fundamentos_plan-30',
          title: 'Plan de 30 días hacia Praxis',
          slug: 'plan-30-dias-praxis',
          order: 2,
          duration: 20,
          isFreePreview: false,
          summary: 'Objetivos semanales antes de talleres.',
          contentMDX: `# Plan de 30 días hacia Praxis

## Semana 1 — Encuadre
- [ ] Encuadre mínimo escrito.
- [ ] Límites de urgencia y derivación definidos.

## Semana 2 — Operación
- [ ] Horarios y capacidad realista.
- [ ] Prueba de videollamada y consultorio.

## Semana 3 — Comunidad
- [ ] Al menos un encuentro comunitario.
- [ ] Áreas a reforzar en talleres identificadas.

## Semana 4 — Puerta a Praxis
- [ ] Elegir primer taller (USD 15 c/u en **03 — Praxis**).

**Siguiente bloque:** **03 — Praxis** (talleres USD 15 + supervisión clínica USD 50).`,
        },
      ],
    },
  ],
}

export async function seedAcademyFundamentos(prisma: PrismaClient) {
  return upsertAcademyCourse(prisma, FUNDAMENTOS_COURSE)
}
