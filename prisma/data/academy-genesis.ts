import type { PrismaClient } from '@prisma/client'
import { upsertAcademyCourse, type SeedCourse } from './academy-seed-shared'

export const PLACEHOLDER_COURSE_SLUGS = [
  'fundamentos-mindfulness',
  'manejo-ansiedad-estres',
  'comunicacion-asertiva',
  'fundamentales-de-la-psicoterapia',
] as const

/**
 * Bloque 01 — Génesis (MF-01 funnel rewrite).
 * Conversion-first: short path → one CTA → docs/manifiesto only in annex.
 */
export const GENESIS_COURSE: SeedCourse = {
  id: 'course_genesis_clinica_digital',
  slug: '01-genesis',
  title: '01 — Génesis',
  summary: 'Entra gratis. Sin compromiso. Descubre si esta comunidad de psicólogos es para ti.',
  description:
    'Esto es para ti si:\n\n- Recién egresaste y necesitas guía, comunidad y un camino claro.\n- Tienes consulta presencial y quieres atender en digital sin perder calidad clínica.\n- Ya atiendes online pero todo se siente desordenado.\n\n**Sin costo. Sin compromiso.** Entras, ves, decides.\n\nMotusDAO es formación, comunidad y herramientas para psicólogos en entornos digitales. Génesis es el punto de partida: te orientas, ves el mapa y decides si pasas a Fundamentos.',
  category: 'Ruta PSM',
  difficulty: 'beginner',
  isPublished: true,
  isFree: true,
  priceCurrency: 'USD',
  instructor: 'MotusDAO',
  instructorTitle: 'Academia de Psicología Digital',
  learningOutcomes: [
    'Saber si MotusDAO encaja contigo.',
    'Entender que Génesis es gratis y sin compromiso.',
    'Ubicar los 5 bloques de la ruta sin saturarte.',
    'Conocer tres ganancias concretas de las herramientas del Hub.',
    'Tener claro el siguiente paso: Fundamentos.',
  ],
  modules: [
    {
      id: 'module_genesis_bienvenida',
      title: 'Empieza aquí',
      summary: 'Orientación, mapa y valor — sin costo, sin compromiso.',
      order: 1,
      lessons: [
        {
          id: 'lesson_genesis_bienvenida-motusdao',
          title: 'Esto es para ti',
          slug: 'esto-es-para-ti',
          order: 1,
          duration: 4,
          isFreePreview: true,
          summary: 'Sin costo, sin compromiso. Entras, ves, decides.',
          contentMDX: `# Esto es para ti

![ChatGPT Image Aug 11, 2026, 02_07_24 AM](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_bienvenida-motusdao/images/cmspqga1p0b823358cb2f6955.png)

Si eres psicólogo y llegaste hasta aquí, probablemente te reconoces en al menos una de estas:

- **Recién egresaste** y no sabes por dónde empezar.
- **Tienes consulta presencial** y quieres atender en digital sin perder calidad clínica.
- **Ya atiendes online** pero todo se siente desordenado.

**Sin costo. Sin compromiso.** Entras, ves y decides si esto es para ti.

## Qué es MotusDAO (en una frase)

Un ecosistema de psicólogos: formación clínica, comunidad y herramientas digitales para tu consulta — hechas desde la clínica, no desde el producto tech.

## Qué vas a hacer aquí (unos minutos)

1. Orientarte.
2. Ver el mapa de la ruta.
3. Entender qué ganas con las herramientas.
4. Decidir si pasas a **Fundamentos**.

**Siguiente paso:** abre la siguiente lección.

![image](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_bienvenida-motusdao/images/cmspqglfr0b8265815b765c0d.png)`,
        },
        {
          id: 'lesson_genesis_mapa-ruta',
          title: 'Tu mapa — solo lo que necesitas hoy',
          slug: 'tu-mapa-hoy',
          order: 2,
          duration: 4,
          isFreePreview: true,
          summary: 'Cinco bloques. Un camino. Tú decides hasta dónde llegar.',
          contentMDX: `# Tu mapa — solo lo que necesitas hoy

![Bloque Genesis imagen ](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_mapa-ruta/images/cmspqls170b8235ce4b0a985c.png)

**Génesis (gratis) → Fundamentos → Praxis → Validación → Portal**

Avanzas cuando tú quieras. No hay examen de entrada.

- **Génesis** ← estás aquí. Gratis. Te orientas y decides.
- **Fundamentos** — siguiente paso. Montas tu práctica digital con encuadre clínico. **USD 20/mes**.
- **Praxis** — cursos y talleres de formación aplicada (habilidades clínicas, casos, ejercicios). La supervisión es una oferta aparte.
- **Validación** — revisión documental y pase hacia funciones profesionales del ecosistema.
- **Portal** — tu consultorio digital operando dentro de MotusDAO.

Hoy solo necesitas esto: si resuena, el siguiente bloque es **Fundamentos**.

![mapa de academia metaverso](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_mapa-ruta/images/cmspqodrt0b8205496d30c53c.png)

**Siguiente paso:** mira qué ganas con las herramientas del Hub.`,
        },
        {
          id: 'lesson_genesis_lo-que-hay-dentro',
          title: 'Qué ganas — tres cosas concretas',
          slug: 'lo-que-hay-dentro',
          order: 3,
          duration: 5,
          isFreePreview: true,
          summary: 'Perfil, consultorio y MotusAI: valor, no inventario.',
          contentMDX: `# Qué ganas — tres cosas concretas

![Screenshot herramientas Hub](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_lo-que-hay-dentro/images/cmspsgqi40b82bd1fefcacd82.png)

No necesitas conocer toda la app hoy. Con esto alcanza:

## 1. Perfil profesional visible

En **Perfil** armas tu identidad clínica. Esa misma información puede alimentar tu presencia en **Psicoterapia**, donde las personas te conocen y agendan.

## 2. Consultorio con un link

Desde **Videochat** (o Perfil → abrir consultorio) atiendes en salas de videollamada: el paciente entra desde el celular, sin instalar nada.

## 3. MotusAI con límites claros

En **MotusAI** tienes apoyo para orientarte en el ecosistema y pensar casos. **No sustituye tu juicio clínico** ni es una historia clínica.

---

Agenda, pagos y comunidad (Telegram / metaverso) están en el Hub; los activas cuando avances en la ruta. Lo esencial para decidir ya está arriba.

## Tu siguiente paso

**Primario — pasa a Fundamentos**  
Ordena tu práctica digital con encuadre clínico. **USD 20/mes.** Es el siguiente bloque de la ruta.

**Secundario (opcional)** — completa tu perfil profesional gratis mientras exploras. No implica pago.

Si MotusDAO no es para ti, también está bien. Ya tienes el mapa.`,
        },
      ],
    },
    {
      id: 'module_genesis_profundizar',
      title: 'Documentación (opcional)',
      summary: 'Manifiesto y docs a fondo — solo si quieres profundizar.',
      order: 2,
      lessons: [
        {
          id: 'lesson_genesis_manifiesto',
          title: 'Manifiesto y documentación',
          slug: 'manifiesto',
          order: 1,
          duration: 4,
          isFreePreview: true,
          summary: 'Lectura opcional. La ruta de conversión ya está en Empieza aquí.',
          contentMDX: `# Manifiesto y documentación

Esta lección es **opcional**. Si ya decidiste pasar a Fundamentos, puedes irte: no necesitas leer esto para avanzar.

## En corto — qué defendemos

La salud mental ya se digitalizó. La pregunta es quién define las reglas.

MotusDAO existe para que los psicólogos tengan un espacio digital construido **desde la clínica**:

- Las herramientas se adaptan a tu método, no al revés.
- La comunidad es el centro (colegas, supervisión, aprendizaje compartido).
- Avanzas a tu ritmo y pagas solo lo que usas.
- Preferimos datos que te pertenecen y gobierno profesional sobre tu práctica.

**Hecha por psicólogos, para psicólogos.**

## Documentación completa

Si quieres el manual a fondo:

- [Ruta del Profesional de la Salud Mental (PSM) →](https://motusdao.gitbook.io/motusdao-para-psicologos)
- [Manifiesto completo →](https://motusdao.gitbook.io/manifiesto)

## Volver al camino

Tu siguiente paso en la Academia sigue siendo **02 — Fundamentos** (USD 20/mes).`,
        },
      ],
    },
  ],
}

/** Upsert Génesis only. Does not touch other route blocks or admin-only courses. */
export async function seedAcademyGenesis(prisma: PrismaClient) {
  return upsertAcademyCourse(prisma, GENESIS_COURSE)
}

/** Full ruta kickoff helper — also removes legacy placeholder course slugs. */
export async function seedAcademyGenesisWithCleanup(prisma: PrismaClient) {
  await prisma.course.deleteMany({ where: { slug: { in: [...PLACEHOLDER_COURSE_SLUGS] } } })
  return seedAcademyGenesis(prisma)
}
