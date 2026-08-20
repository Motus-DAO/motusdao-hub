import type { PrismaClient } from '@prisma/client'
import { buildPraxisBlockCourse } from './academy-praxis'
import { upsertAcademyCourse, type SeedCourse } from './academy-seed-shared'

/** Bloque 04 — Validación (documentación MCP: 04_validacion). */
export const VALIDACION_COURSE: SeedCourse = {
  id: 'course_validacion',
  slug: '04-validacion',
  title: '04 — Validación',
  summary:
    'Revisión documental y Pase clínico: USD 50/mes o USD 480/año (sobre USD 600) para habilitar el Portal.',
  description: `Bloque **04 — Validación**.

Documenta avance, credenciales y encuadre. Si cumples criterios, puedes adquirir el **Pase clínico**:

**USD 50/mes** o **USD 480/año** (referencia comercial sobre USD 600 anuales).

**Módulo 1 — Documentar avance:** evidencia y verificación.

**Módulo 2 — Pase clínico:** invitación al Portal Clínico.`,
  category: 'Ruta PSM',
  difficulty: 'intermediate',
  isPublished: true,
  isFree: false,
  priceAmount: 50,
  priceCurrency: 'USD',
  instructor: 'MotusDAO',
  instructorTitle: 'Academia de Psicología Digital',
  learningOutcomes: [
    'Documentar tu avance en la ruta con evidencia ordenada.',
    'Reunir credenciales y requisitos profesionales aplicables.',
    'Entender el Pase clínico (USD 50/mes · 480/año) y criterios de invitación al Portal.',
    'Distinguir ruta comunitaria vs entrada directa al Portal.',
  ],
  modules: [
    {
      id: 'module_validacion_documentar',
      title: 'Documentar avance y requisitos',
      summary: 'Evidencia, credenciales y encuadre.',
      order: 1,
      lessons: [
        {
          id: 'lesson_validacion_que-es',
          title: 'Qué es el bloque Validación',
          slug: 'que-es-validacion',
          order: 1,
          duration: 16,
          isFreePreview: true,
          summary: 'Revisión de preparación para funciones profesionales en el ecosistema.',
          contentMDX: `# Qué es el bloque Validación

Validación es el bloque donde se revisa si una persona está lista para avanzar hacia **funciones más profesionales** dentro del ecosistema.

El foco es:

- ordenar evidencia;
- revisar credenciales;
- documentar encuadre;
- definir si corresponde supervisión, pase beta o aplicación al Portal Clínico.

## Qué haces en este bloque

1. Documentas tu avance en la ruta.
2. Reúnes credenciales y requisitos profesionales.
3. Revisas tu encuadre clínico.
4. Defines si corresponde supervisión.
5. Recibes retroalimentación cuando aplique.
6. Preparas tu posible aplicación al Pase Motus Beta o al Portal Clínico.

## Qué puede desbloquear

- invitación al **Pase Motus Beta**;
- acceso a funciones beta;
- posibilidad de avanzar al Portal Clínico;
- mayor claridad sobre requisitos profesionales.`,
        },
        {
          id: 'lesson_validacion_credenciales',
          title: 'Credenciales y verificación documental',
          slug: 'credenciales-verificacion',
          order: 2,
          duration: 20,
          isFreePreview: false,
          summary: 'Identidad, cédula, formación y lenguaje de profesional verificado.',
          contentMDX: `# Credenciales y verificación documental

## Verificación interna MotusDAO

Puede incluir revisión de:

- identidad;
- cédula profesional o equivalente aplicable;
- formación declarada;
- código de conducta y encuadre.

## Lenguaje permitido

| Sí | No |
|---|---|
| "Cédula consultada en el Registro Nacional el [fecha]" | "Calidad clínica verificada" (si solo se revisó identidad) |
| "Profesional verificado" con procedimiento documentado | "Especialista certificado por MotusDAO" |
| "Verificación documental interna" | "Licencia" o "certificación oficial" |

## Evidencia de la ruta

Organiza:

- constancias de talleres (Praxis);
- registros de membresía activa;
- supervisiones tomadas (si aplica);
- actualización de encuadre y protocolo de crisis.`,
        },
      ],
    },
    {
      id: 'module_validacion_pase',
      title: 'Pase Motus Beta y siguiente paso',
      summary: 'Invitación, criterios y transición a Operar.',
      order: 2,
      lessons: [
        {
          id: 'lesson_validacion_pase-beta',
          title: 'Pase clínico',
          slug: 'pase-clinico',
          order: 1,
          duration: 18,
          isFreePreview: false,
          summary: 'USD 50/mes o USD 480/año — habilita acceso al Portal.',
          contentMDX: `# Pase clínico

Tras revisión documental, MotusDAO puede **invitarte** a adquirir el **Pase clínico**.

## Referencia de inversión

- **USD 50/mes**
- **USD 480/año** (sobre USD 600 anuales de referencia)

## Qué habilita

- Acceso al **05 — Portal Clínico** (operación con herramientas según permisos).
- Continuidad de verificación y conducta interna.

## Qué no es

- Licencia para ejercer ni certificación oficial.
- Garantía de pacientes o ingresos.

## Dos rutas

**Comunitaria** — Genesis → Fundamentos → Praxis → Validación → Pase.

**Directa** — Profesionales con experiencia documentable; revisión acelerada en este bloque.`,
        },
        {
          id: 'lesson_validacion_cierre',
          title: 'Cierre de Validación',
          slug: 'cierre-validacion-portal',
          order: 2,
          duration: 12,
          isFreePreview: false,
          summary: 'Checklist antes del bloque Portal Clínico.',
          contentMDX: `# Cierre de Validación

## Checklist

- [ ] Evidencia de ruta organizada (talleres, membresía, supervisiones).
- [ ] Credenciales cargadas y revisadas.
- [ ] Encuadre actualizado.
- [ ] Entiendo diferencia entre pase beta, verificación y Portal Clínico.

## Siguiente bloque: 05 — Portal Clínico

Si cuentas con experiencia clínica documentable y cumples criterios de onboarding, puedes **aplicar al acceso beta** del Portal Clínico.

Si aún construyes tu práctica, la ruta comunitaria puede ser mejor entrada — sin atajos éticos.`,
        },
      ],
    },
  ],
}

/** Bloque 05 — Portal Clínico (documentación MCP: 05_portal-clinico). */
export const PORTAL_CLINICO_COURSE: SeedCourse = {
  id: 'course_portal_clinico',
  slug: '05-portal-clinico',
  title: '05 — Portal Clínico',
  summary:
    'Opera en el portal: pase USD 50/mes + supervisión USD 35/mes para permanecer activo.',
  description: `Bloque **05 — Portal Clínico**.

Operación recurrente con **pase clínico USD 50/mes** (o anual desde Validación) más **supervisión USD 35/mes** para permanecer activo en el portal.

**Módulo 1 — Acceso:** requisitos y onboarding.

**Módulo 2 — Operar:** consultorio, perfil y límites.

> No garantizamos pacientes. Supervisión Portal (USD 35/mes) ≠ supervisión Praxis (USD 50/sesión).`,
  category: 'Ruta PSM',
  difficulty: 'advanced',
  isPublished: true,
  isFree: false,
  priceAmount: 50,
  priceCurrency: 'USD',
  instructor: 'MotusDAO',
  instructorTitle: 'Academia de Psicología Digital',
  learningOutcomes: [
    'Entender costos recurrentes: pase USD 50/mes + supervisión Portal USD 35/mes.',
    'Completar onboarding y configuración de perfil profesional.',
    'Operar consultorio digital y herramientas según permisos.',
    'Distinguir supervisión mensual del Portal vs supervisión en Praxis.',
  ],
  modules: [
    {
      id: 'module_portal_acceso',
      title: 'Aplicar al acceso beta',
      summary: 'Requisitos, documentación y onboarding.',
      order: 1,
      lessons: [
        {
          id: 'lesson_portal_que-es',
          title: 'Qué es el Portal Clínico',
          slug: 'que-es-portal-clinico',
          order: 1,
          duration: 18,
          isFreePreview: true,
          summary: 'Bloque profesional para operar con herramientas digitales.',
          contentMDX: `# Qué es el Portal Clínico

El Portal Clínico es el bloque **profesional** de MotusDAO.

Está pensado para psicólogos **activos** con experiencia clínica documentable que quieren operar con herramientas digitales dentro del ecosistema.

## Para quién es

Profesionales que quieren entrar **sin recorrer toda la formación desde cero**, si cumplen:

- cédula profesional o equivalente aplicable;
- experiencia clínica comprobable;
- onboarding obligatorio;
- aceptación de criterios éticos y operativos;
- revisión de encuadre.

## Qué haces en este bloque

1. Aplicas al acceso beta.
2. Presentas documentación profesional.
3. Completas el onboarding.
4. Configuras tu perfil.
5. Accedes a herramientas digitales.
6. Participas según permisos otorgados.`,
        },
        {
          id: 'lesson_portal_requisitos',
          title: 'Requisitos y rutas de entrada',
          slug: 'requisitos-portal-clinico',
          order: 2,
          duration: 16,
          isFreePreview: false,
          summary: 'Entrada directa vs ruta comunitaria.',
          contentMDX: `# Requisitos y rutas de entrada

## Entrada directa

Para profesionales con trayectoria documentable que cumplen onboarding y revisión. **No es el camino por defecto.**

## Ruta comunitaria (referencia)

1. Comunidad gratuita.
2. Membresía de Práctica Digital.
3. ~seis talleres en Praxis.
4. ~tres supervisiones.
5. Pase comunitario.

Costo acumulado orientativo del primer año: **USD 560–650**.

## Siguiente paso

Si ya tienes experiencia clínica documentable, puedes aplicar al Portal Clínico beta.

Si todavía construyes tu práctica, la ruta comunitaria puede ser mejor entrada.`,
        },
      ],
    },
    {
      id: 'module_portal_operar',
      title: 'Operar en el ecosistema',
      summary: 'Herramientas, perfil público y límites.',
      order: 2,
      lessons: [
        {
          id: 'lesson_portal_herramientas',
          title: 'Qué puede habilitar el Portal',
          slug: 'herramientas-portal-clinico',
          order: 1,
          duration: 20,
          isFreePreview: false,
          summary: 'Consultorio virtual, biblioteca y espacios restringidos.',
          contentMDX: `# Qué puede habilitar el Portal

El Portal Clínico puede habilitar, según permisos:

- **consultorio digital** y salas Jitsi;
- perfil profesional en el ecosistema;
- herramientas de práctica en **app.motusdao.org**;
- posibilidad de recibir consultas (sin garantía).

## Costos recurrentes

- **Pase clínico:** USD 50/mes (o anual desde Validación).
- **Supervisión Portal:** **USD 35/mes** para permanecer activo.

> La supervisión en **03 — Praxis** (USD 50/sesión) es un producto distinto.`,
        },
        {
          id: 'lesson_portal_cierre',
          title: 'Cierre de la ruta MotusDAO',
          slug: 'cierre-ruta-portal-clinico',
          order: 2,
          duration: 14,
          isFreePreview: false,
          summary: 'Recorrido completo Entender → Operar.',
          contentMDX: `# Cierre de la ruta MotusDAO

Has recorrido los **5 bloques** de la Academia:

| Bloque | Producto |
|---|---|
| 01 | Génesis — Comunidad gratis |
| 02 | Fundamentos — Membresía USD 20/mes |
| 03 | Praxis — Talleres USD 15 + supervisión USD 50 |
| 04 | Validación — Pase USD 50/mes |
| 05 | Portal — Pase + supervisión USD 35/mes |

## Compromiso continuo

- Actualizar encuadre y protocolos.
- Participar en formación continua (Praxis).
- Mantener lenguaje ético en perfil y marketing.
- Revalidar credenciales cuando MotusDAO lo requiera.

## Recordatorio final

MotusDAO entrega **formación, comunidad, herramientas y verificación documental interna** cuando aplica.

**No** entrega certificación oficial externa, licencia para ejercer ni garantía de pacientes.

Gracias por construir práctica digital con criterio clínico y responsabilidad.`,
        },
      ],
    },
  ],
}

export const ROUTE_BLOCK_COURSES = [VALIDACION_COURSE, PORTAL_CLINICO_COURSE] as const

export async function seedAcademyRouteBlocks(prisma: PrismaClient) {
  const courses = []
  courses.push(await upsertAcademyCourse(prisma, buildPraxisBlockCourse()))
  for (const block of ROUTE_BLOCK_COURSES) {
    courses.push(await upsertAcademyCourse(prisma, block))
  }
  return courses
}
