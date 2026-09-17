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
    'Conocer a quienes crearon la Ruta PSM.',
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
          duration: 5,
          isFreePreview: true,
          summary: 'Sin costo, sin compromiso. Conoce la ruta y a quienes la crearon.',
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

![image](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_bienvenida-motusdao/images/cmspqglfr0b8265815b765c0d.png)

## Quién creó la Ruta PSM

La Ruta PSM fue creada por psicólogos que trabajan en la intersección entre práctica clínica, formación y tecnología.

### Lic. Gerry Alvarez

<img src="/academy/creators/gerry-alvarez.jpg" alt="Lic. Gerry Alvarez" class="academy-creator-photo" width="140" height="140" />

**Founder, CEO · Producto y Ecosistema**

Psicólogo y creador de MotusDAO. Diseñó la Ruta PSM como un recorrido para ayudar a profesionales de salud mental a desarrollar una práctica digital más estructurada, desde su formación y presencia profesional hasta las herramientas que utilizan para operar y crecer.

En MotusDAO dirige el desarrollo del producto, la tecnología y el ecosistema profesional, conectando las necesidades reales de los psicólogos con nuevas herramientas para ejercer en digital.

### Mtro. Benjamín Buzali

<img src="/academy/creators/benjamin-buzali.jpg" alt="Mtro. Benjamín Buzali" class="academy-creator-photo" width="140" height="140" />

**Co-Founder, COO · Dirección Clínica y Formación**

Psicólogo y docente enfocado en razonamiento clínico, formulación de casos y estructuras de personalidad. En MotusDAO desarrolla contenidos y programas de formación orientados a fortalecer el criterio clínico y llevar conceptos complejos a herramientas útiles para la práctica profesional.

Su trabajo da origen a parte de los contenidos de **Praxis**, construidos a partir de años de estudio, práctica y desarrollo académico.`,
        },
        {
          id: 'lesson_genesis_mapa-ruta',
          title: 'Tu mapa — solo lo que necesitas hoy',
          slug: 'tu-mapa-hoy',
          order: 2,
          duration: 5,
          isFreePreview: true,
          summary: 'Cinco bloques, Validación y Portal claros, y lo que obtienes en Fundamentos.',
          contentMDX: `# Tu mapa — solo lo que necesitas hoy

![Bloque Genesis imagen ](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_mapa-ruta/images/cmspqls170b8235ce4b0a985c.png)

**Génesis (gratis) → Fundamentos → Praxis → Validación → Portal**

Avanzas cuando tú quieras. No hay examen de entrada.

- **Génesis** ← estás aquí. Gratis. Te orientas y decides.
- **Fundamentos** — siguiente paso. Montas tu práctica digital con encuadre clínico. **USD 20/mes**.
- **Praxis** — cursos y talleres de formación aplicada (habilidades clínicas, casos, ejercicios). La supervisión es una oferta aparte.
- **Validación** — revisamos tus documentos, experiencia y requisitos profesionales.
  - Si **aún no cumples**, te invitamos a seguir por la **ruta comunitaria**: formarte, documentar tu avance y prepararte.
  - Si **cumples**, puedes avanzar al **Portal clínico**.
- **Portal clínico** — tu consultorio digital operando dentro de MotusDAO. No es otro curso: es el espacio donde ejerces con las herramientas del ecosistema.

![mapa de academia metaverso](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_mapa-ruta/images/cmspqodrt0b8205496d30c53c.png)

<div class="academy-outcome-box">
<p><strong>Al terminar Fundamentos tendrás:</strong></p>
<ul>
<li>Tu consulta digital configurada.</li>
<li>Un encuadre claro para la atención online.</li>
<li>Tus herramientas esenciales organizadas.</li>
<li>Criterios para usar IA.</li>
</ul>
</div>

<a class="academy-cta-primary" href="/academia/02-fundamentos">Continuar a Fundamentos — USD 20/mes</a>

<a class="academy-cta-secondary" href="/perfil">Completar perfil (gratis)</a>

O sigue a la siguiente lección para ver las herramientas del Hub y voces de colegas.`,
        },
        {
          id: 'lesson_genesis_lo-que-hay-dentro',
          title: 'Qué ganas — tres cosas concretas',
          slug: 'lo-que-hay-dentro',
          order: 3,
          duration: 7,
          isFreePreview: true,
          summary: 'Perfil, videochat, casos del Hub, voces de colegas y tu siguiente paso.',
          contentMDX: `# Qué ganas — tres cosas concretas

No necesitas conocer toda la app hoy. Con esto alcanza:

## 1. Perfil profesional visible

En **Perfil** armas tu identidad clínica. Esa misma información puede alimentar tu presencia en **Psicoterapia**, donde las personas te conocen y agendan.

<img src="/academy/product/hub-perfil.png" alt="Vista de Perfil en el Hub MotusDAO" class="academy-product-shot" />

## 2. Consultorio con un link

Desde **Videochat** (o Perfil → abrir consultorio) atiendes en salas de videollamada: el paciente entra desde el celular, sin instalar nada.

<img src="/academy/product/hub-videochat.jpg" alt="Sala de Videochat en el Hub MotusDAO" class="academy-product-shot" />

## 3. Casos y seguimiento organizados

En el Hub puedes ordenar casos, avances y notas de supervisión en un solo lugar — para que tu práctica digital no viva en capturas y chats dispersos.

<img src="/academy/product/hub-casos.png" alt="Vista de casos y seguimiento en el Hub MotusDAO" class="academy-product-shot" />

---

También tienes **MotusAI** (con límites claros: no sustituye tu juicio clínico), pagos y comunidad (Telegram / metaverso). Los activas cuando avances en la ruta. Lo esencial para decidir ya está arriba.

## Lo que dicen colegas

> “Lo más valioso para mí es el abordaje clínico: revisamos teoría y conceptos aplicados a lo que sucede día a día en el consultorio. El intercambio con los colegas genera mucha confianza y enriquece cada encuentro.”
>
> — **Fernando Lorenzana**

> “He encontrado una orientación más clara para trabajar con el discurso del paciente. El enfoque en la lógica y la argumentación me ha resultado muy práctico para entender cómo llevar lo que estudiamos a la intervención clínica.”
>
> — **Samantha Perez**

> “El curso me ha dado herramientas que ya utilizo en mis sesiones. Me ha servido especialmente para escuchar mejor al paciente y reformular lo que dice en una pregunta. Eso me ha ayudado a revisar mi manera de intervenir.”
>
> — **Maribel Garcia**

## Tu siguiente paso

<div class="academy-outcome-box">
<p><strong>Al terminar Fundamentos tendrás:</strong></p>
<ul>
<li>Tu consulta digital configurada.</li>
<li>Un encuadre claro para la atención online.</li>
<li>Tus herramientas esenciales organizadas.</li>
<li>Criterios para usar IA.</li>
</ul>
</div>

<a class="academy-cta-primary" href="/academia/02-fundamentos">Continuar a Fundamentos — USD 20/mes</a>

<a class="academy-cta-secondary" href="/perfil">Completar perfil (gratis)</a>

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
