import type { PrismaClient } from '@prisma/client'
import { upsertAcademyCourse, type SeedCourse } from './academy-seed-shared'

export const PLACEHOLDER_COURSE_SLUGS = [
  'fundamentos-mindfulness',
  'manejo-ansiedad-estres',
  'comunicacion-asertiva',
  'fundamentales-de-la-psicoterapia',
] as const

const MODULE_BIENVENIDA = {
  id: 'module_genesis_bienvenida',
  title: 'Bienvenida al ecosistema',
  summary: 'Por qué existe MotusDAO, mapa de la ruta y cómo usar la Academia.',
  order: 1,
  lessons: [
    {
      id: 'lesson_genesis_bienvenida-motusdao',
      title: 'Bienvenida: qué es MotusDAO y la Academia',
      slug: 'bienvenida-motusdao-academia',
      order: 1,
      duration: 20,
      isFreePreview: true,
      summary: 'Misión, visión y el por qué del ecosistema.',
      contentMDX: `# Bienvenida: qué es MotusDAO

MotusDAO es un ecosistema para profesionales de la salud mental que combina **formación**, **comunidad** y **herramientas digitales** con un enfoque ético en IA y tecnología.

**Génesis** es el punto de entrada: entender **por qué** existe MotusDAO y cómo puedes participar sin compromiso económico inicial (Comunidad Motus — gratuita).

| Es | No es |
|---|---|
| Formación y comunidad profesional | Terapia ni atención clínica |
| Puerta al ecosistema | Certificación oficial ni garantía de pacientes |

> Si necesitas atención clínica, busca un profesional habilitado en tu jurisdicción.`,
    },
    {
      id: 'lesson_genesis_mapa-ruta',
      title: 'Mapa de la ruta (5 bloques)',
      slug: 'mapa-ruta-profesional',
      order: 2,
      duration: 18,
      isFreePreview: true,
      summary: 'Génesis → Fundamentos → Praxis → Validación → Portal Clínico.',
      contentMDX: `# Mapa de la ruta profesional

\`\`\`
01 Génesis → 02 Fundamentos → 03 Praxis → 04 Validación → 05 Portal Clínico
\`\`\`

| Bloque | Producto / cobro | Qué haces |
|---|---|---|
| **01 Génesis** | Comunidad Motus — **gratis** | Entiendes el por qué y los entornos digitales |
| **02 Fundamentos** | Membresía Práctica Digital — **USD 20/mes · 120/año** | Psicoterapia digital, encuadre, ética |
| **03 Praxis** | Talleres **USD 15** + supervisión **USD 50** | Formación continua y supervisión clínica |
| **04 Validación** | Pase clínico **USD 50/mes · 480/año** | Revisión documental; invitación al portal |
| **05 Portal Clínico** | **USD 50/mes** pase + **USD 35/mes** supervisión | Operar consultorio, perfil y herramientas |

## Dos rutas de entrada

**Ruta comunitaria** — Paso a paso: comunidad → membresía → talleres → supervisiones → validación → pase.

**Ruta directa al Portal** — Para profesionales con experiencia documentable; revisión acelerada en Validación.

Estás en **01 — Génesis**. Tu siguiente paso es **02 — Fundamentos** cuando quieras estructura de pago.`,
    },
    {
      id: 'lesson_genesis_que-entrega-motusdao',
      title: 'Qué MotusDAO sí entrega y qué no',
      slug: 'que-entrega-motusdao',
      order: 3,
      duration: 15,
      isFreePreview: false,
      summary: 'Disclaimers: formación vs habilitación.',
      contentMDX: `# Qué MotusDAO sí entrega y qué no

**Sí:** formación, comunidad, herramientas (según etapa), verificación documental interna, constancia de participación.

**No:** certificación oficial externa, licencia para ejercer, garantía de pacientes, aval clínico automático por talleres.

Usa lenguaje responsable: "constancia de participación", no "certificación MotusDAO".`,
    },
    {
      id: 'lesson_genesis_como-usar-academia',
      title: 'Cómo usar la Academia',
      slug: 'como-usar-academia',
      order: 4,
      duration: 12,
      isFreePreview: false,
      summary: 'Catálogo de bloques, lecciones y progreso.',
      contentMDX: `# Cómo usar la Academia

1. **Catálogo** (\`/academia\`) — Los 5 bloques de la ruta PSM.
2. **Detalle del bloque** — Módulos y lecciones.
3. **Player** — Marca lecciones completadas con tu cuenta.

Las lecciones **preview** en Génesis son gratuitas sin inscripción completa.

**Siguiente módulo:** Entornos digitales MotusDAO (metaverso, Jitsi, app).`,
    },
  ],
}

const MODULE_ENTORNOS = {
  id: 'module_genesis_entornos',
  title: 'Entornos digitales MotusDAO',
  summary: 'Metaverso, salas Jitsi, consultorios y la app web.',
  order: 2,
  lessons: [
    {
      id: 'lesson_genesis_metaverso-intro',
      title: 'Metaverso y espacios inmersivos',
      slug: 'metaverso-motusdao',
      order: 1,
      duration: 22,
      isFreePreview: true,
      summary: 'Formación y encuentros en entornos inmersivos.',
      contentMDX: `# Metaverso dentro de MotusDAO

MotusDAO incluye **espacios inmersivos** (metaverso) para formación, encuentros comunitarios y ejercicios colaborativos entre psicólogos.

## Para qué sirve

- Talleres y dinámicas grupales con presencia espacial.
- Encuentros de comunidad con moderación.
- Exploración de formatos híbridos entre lo presencial y lo digital.

## Qué no implica

El metaverso **no sustituye** el juicio clínico ni el encuadre terapéutico. Es un **entorno adicional** dentro del ecosistema, no obligatorio para toda la ruta.`,
    },
    {
      id: 'lesson_genesis_jitsi-consultorios',
      title: 'Salas Jitsi y consultorios digitales',
      slug: 'jitsi-consultorios-digitales',
      order: 2,
      duration: 25,
      isFreePreview: false,
      summary: 'Videollamada clínica con criterios de privacidad.',
      contentMDX: `# Salas Jitsi y consultorios digitales

## Salas Jitsi MotusDAO

Las **salas Jitsi** integradas en el ecosistema están pensadas para videollamada clínica con criterios de **privacidad y control** superiores a herramientas genéricas como Google Meet o Zoom en contexto de salud mental:

- Menor dependencia de ecosistemas comerciales no orientados a datos sensibles.
- Configuración alineada al encuadre MotusDAO.
- Integración con el flujo profesional del Hub.

## Consultorios digitales

Los **consultorios digitales** son donde ocurren las **sesiones terapéuticas** dentro de la plataforma: espacio acotado, vinculado a tu perfil profesional y a los permisos de tu etapa en la ruta.

> Usar Jitsi o consultorio MotusDAO no elimina tu responsabilidad ética ni legal como profesional.`,
    },
    {
      id: 'lesson_genesis_app-motusdao',
      title: 'App web: app.motusdao.org',
      slug: 'app-motusdao-org',
      order: 3,
      duration: 20,
      isFreePreview: false,
      summary: 'Mismo ecosistema sin entrar al metaverso.',
      contentMDX: `# La app web: app.motusdao.org

**Todo el ecosistema también opera desde la aplicación web** — no necesitas el metaverso para avanzar.

Desde **app.motusdao.org** puedes:

- Acceder a la Academia y bloques de la ruta.
- Usar **salas Jitsi** y **consultorios digitales** para sesiones.
- Gestionar tu perfil profesional (según permisos).
- Participar en comunidad y formación.

## Dos caminos, un ecosistema

| Camino | Cuándo elegirlo |
|---|---|
| **App web** | Operación diaria, sesiones, academia, perfil |
| **Metaverso** | Encuentros inmersivos, talleres experienciales |

## Cierre de Génesis

- [ ] Entiendo el por qué de MotusDAO.
- [ ] Conozco los 5 bloques y sus productos.
- [ ] Sé la diferencia entre metaverso, Jitsi, consultorio y app web.

**Siguiente bloque:** **02 — Fundamentos** (Membresía de Práctica Digital — USD 20/mes).`,
    },
  ],
}

export const GENESIS_COURSE: SeedCourse = {
  id: 'course_genesis_clinica_digital',
  slug: '01-genesis',
  title: '01 — Génesis',
  summary:
    'Gratis: entiende el por qué de MotusDAO, el mapa de la ruta, metaverso, Jitsi, consultorios y app.motusdao.org.',
  description: `**01 — Génesis** — Comunidad Motus (gratuita).

Entiende la visión, el mapa de los 5 bloques y cómo operar en el ecosistema: metaverso, salas Jitsi, consultorios digitales y la app web **app.motusdao.org**.

**Módulo 1:** Bienvenida y mapa de ruta.
**Módulo 2:** Entornos digitales (metaverso, Jitsi, consultorios, app).`,
  category: 'Ruta PSM',
  difficulty: 'beginner',
  isPublished: true,
  isFree: true,
  instructor: 'MotusDAO',
  instructorTitle: 'Academia de Psicología Digital',
  learningOutcomes: [
    'Explicar por qué existe MotusDAO y qué no promete.',
    'Ubicarte en los 5 bloques y sus productos asociados.',
    'Distinguir metaverso, Jitsi, consultorios digitales y app.motusdao.org.',
    'Identificar tu siguiente paso hacia Fundamentos.',
  ],
  modules: [MODULE_BIENVENIDA, MODULE_ENTORNOS],
}

export async function seedAcademyGenesis(prisma: PrismaClient) {
  await prisma.course.deleteMany({ where: { slug: { in: [...PLACEHOLDER_COURSE_SLUGS] } } })
  return upsertAcademyCourse(prisma, GENESIS_COURSE)
}
