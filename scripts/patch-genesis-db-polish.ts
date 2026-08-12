/**
 * One-off: polish Genesis content in DB (MX Spanish, order, community, payments).
 * Does not touch seed files.
 */
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config({ path: '.env.local' })
config()

const prisma = new PrismaClient()

const MAPA_CONTENT = `# Tu mapa — solo lo que necesitas saber hoy

![Bloque Genesis imagen ](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_mapa-ruta/images/cmspqls170b8235ce4b0a985c.png)

Esto es todo lo que tienes que saber por ahora:

**Génesis (gratis) → Fundamentos → Praxis → Validación → Portal**

Avanzas cuando tú quieras. No hay prisa, no hay examen de entrada.

- **Génesis** ← estás aquí. Gratis, sin compromiso. Te orientas.
- **Fundamentos** — el siguiente paso. Aprendes a montar tu práctica digital con encuadre clínico. Sin improvisar, sin perder pacientes en el intento. $20/mes.
- **Praxis** — espacio clínico con herramientas, supervisión y consultorio virtual.
- **Validación** — evaluación y validación / constancia de competencias.
- **Portal** — tu consultorio digital funcionando.

Los bloques 3, 4 y 5 los ves cuando llegues. No necesitas saberlo todo hoy.

![mapa de academia metaverso](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_mapa-ruta/images/cmspqodrt0b8205496d30c53c.png)

## Tu primera semana en MotusDAO

En los próximos 7 días vas a:

1. Orientarte en Génesis (este bloque) y decidir si resuena contigo.
2. Conocer la **comunidad** — nos reunimos por Telegram y en el metaverso. El enlace te lo compartimos más adelante en la ruta.
3. Explorar el mapa del PSM y, si quieres, pasar a Fundamentos.

Sin pagar un peso.

## ¿Quieres profundizar?

Si eres de los que lee los manuales completos antes de empezar, aquí tienes la documentación a fondo:

[Ruta del Profesional de la Salud Mental (PSM) →](https://motusdao.gitbook.io/motusdao-para-psicologos)

**Siguiente paso:** cuando estés listo, Fundamentos te espera.`

const MANIFIESTO_CONTENT = `# Manifiesto — Own Your Data

La salud mental está siendo digitalizada. Eso ya pasó. No hay vuelta atrás. La pregunta es quién define las reglas y cómo evitamos la extracción de datos sensibles.

Hoy, la mayoría de las herramientas digitales para psicólogos las construyen empresas tech que nunca han estado en una sesión clínica. Sus prioridades son retención, engagement y datos del usuario. Las tuyas son encuadre, transferencia y ética. Esas dos lógicas no siempre se alinean.

MotusDAO existe para que los psicólogos tengan un espacio digital construido desde la clínica, no desde el producto.

Esto significa:

- **Las herramientas se adaptan a tu método**, no al revés. No necesitas cambiar cómo trabajas para usar la plataforma.
- **La comunidad no es un feature**, es el centro. Supervisión entre colegas, discusión de casos y construcción colectiva de conocimiento — en Telegram y en encuentros en el metaverso (el acceso te lo damos más adelante).
- **La ruta es tuya.** Entras por donde quieras, avanzas a tu ritmo, pagas solo lo que usas. No hay embudos diseñados para atraparte.
- **Lo abierto gana.** Preferimos estándares abiertos, datos que te pertenecen y gobierno de la comunidad profesional sobre decisiones que afectan tu práctica.

No somos una startup que busca escalar a toda costa. Somos una red de psicólogos construyendo las herramientas que necesitamos para ejercer en digital con el mismo rigor que en presencial. **Hecha por psicólogos, para psicólogos.**

Si eso te resuena, este es tu lugar. Si no, también está bien — al menos sabes que existe.

[Leer el Manifiesto completo →](https://motusdao.gitbook.io/manifiesto)`

const HERRAMIENTAS_CONTENT = `# Lo que hay dentro — herramientas que acompañan la ruta

![Screenshot herramientas Hub](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_lo-que-hay-dentro/images/cmspsgqi40b82bd1fefcacd82.png)

Génesis es la puerta. Esto es lo que **ya está listo** en la app del Hub para ti como profesional.

## Tu perfil profesional y reputación online

En **Perfil** armas tu identidad clínica: especialidades, bio, capacidad de atención. Esa misma información alimenta tu presencia pública en **Psicoterapia**, donde las personas pueden conocerte y agendar. Puedes sumar certificados para ganar más confianza en el ecosistema.

## Disponibilidad y citas

En **Disponibilidad** publicas tus horarios. Cuando alguien reserva, se crea el emparejamiento. Tú controlas tus horarios; la app hace el resto del puente.

## Consultorio virtual

Desde **Videochat** (y desde Perfil → abrir consultorio) tienes salas seguras de videollamada: el paciente entra desde el celular, sin instalar nada, con un link único. Cada vínculo de atención puede operar por **app** o en el **metaverso**.

## MotusAI

En **MotusAI** tienes un asistente orientado a profesionales clínicos de MotusDAO: preguntas sobre el ecosistema, los cursos y apoyo para pensar casos (incluye un modo supervisor experimental). **No sustituye tu juicio clínico** ni es una historia clínica.

## Academia

Lo que estás leyendo ahora. Catálogo de bloques, lecciones, progreso y (cuando aplique) membresías. Arrancas en Génesis gratis; Fundamentos y lo que sigue aparecen cuando quieras avanzar.

## Comunidad (fuera de la app)

La vida de la comunidad — colegas, casos, acompañamiento — ocurre en **Telegram** y en **reuniones en el metaverso**. No es un chat que se apaga a los tres días. El enlace de acceso te lo compartimos más adelante en la ruta.

## Pagos

En **Pagos** manejas tu propia cuenta dentro del Hub para enviar y recibir. MotusDAO **no se queda con tu dinero**: tú controlas tus fondos y eliges cómo retirarlos con proveedores de confianza. Sin intermediarios ocultos ni “caja negra”.

## Matching (usuarios ↔ PSM)

El sistema conecta perfiles y agendas. Hoy ves tus emparejamientos activos desde **Perfil**. Usa Perfil como fuente de verdad mientras afinamos la bandeja “Mis usuarios”.

---

## Próximamente

Lo esencial ya está. Esto es lo que viene después (sin prisa):

- Historia clínica por paciente, integrada al consultorio
- Memoria / resumen inteligente de sesiones
- Más agentes de apoyo para tu práctica

Somos una plataforma en evolución constante, con foco en salud mental.

---

**Tu única decisión ahora:** ¿sabes ya si MotusDAO es para ti?

Si sí, Fundamentos te espera. Si necesitas más tiempo, sigue explorando — y vuelve cuando quieras.`

async function main() {
  const now = new Date()

  await prisma.course.update({
    where: { slug: '01-genesis' },
    data: {
      description: `Esto es para ti si:

- Recién egresaste y necesitas guía, comunidad y un camino claro.
- Tienes consulta presencial y quieres atender en digital sin perder calidad clínica.
- Ya atiendes online pero todo se siente desordenado.

**Sin costo. Sin compromiso.** Entras, ves, decides.

MotusDAO es un espacio de formación, comunidad y herramientas para psicólogos que quieren ejercer con claridad en entornos digitales. Génesis es el punto de partida: te orientas y ves el mapa — el resto, cuando tú quieras.

Docs a fondo: [Ruta PSM](https://motusdao.gitbook.io/motusdao-para-psicologos).`,
      updatedAt: now,
    },
  })

  await prisma.lesson.update({
    where: { id: 'lesson_genesis_mapa-ruta' },
    data: {
      contentMDX: MAPA_CONTENT,
      updatedAt: now,
    },
  })

  // Conversion order: Manifiesto (por qué) → herramientas (prueba)
  await prisma.lesson.update({
    where: { id: 'lesson_genesis_manifiesto' },
    data: {
      order: 1,
      title: 'Manifiesto — para quien quiere entender de qué va esto',
      summary: 'No somos una plataforma de cursos. Esto es lo que defendemos.',
      contentMDX: MANIFIESTO_CONTENT,
      updatedAt: now,
    },
  })

  await prisma.lesson.update({
    where: { id: 'lesson_genesis_lo-que-hay-dentro' },
    data: {
      order: 2,
      summary:
        'Perfil, agenda, consultorio, MotusAI, academia y pagos: lo que ya puedes usar en la app.',
      contentMDX: HERRAMIENTAS_CONTENT,
      updatedAt: now,
    },
  })

  await prisma.module.update({
    where: { id: 'module_genesis_profundizar' },
    data: {
      summary: 'Manifiesto y herramientas — lectura opcional para decidir con claridad.',
      updatedAt: now,
    },
  })

  console.log('✅ Genesis DB content updated (order + MX polish + mobile-ready copy)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
