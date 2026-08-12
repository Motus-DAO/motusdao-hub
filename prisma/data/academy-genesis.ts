import type { PrismaClient } from '@prisma/client'
import { upsertAcademyCourse, type SeedCourse } from './academy-seed-shared'

export const PLACEHOLDER_COURSE_SLUGS = [
  'fundamentos-mindfulness',
  'manejo-ansiedad-estres',
  'comunicacion-asertiva',
  'fundamentales-de-la-psicoterapia',
] as const

/** Locked from admin — 2026-08-12T09:47:16.705Z */
export const GENESIS_COURSE: SeedCourse = {
  "id": "course_genesis_clinica_digital",
  "slug": "01-genesis",
  "title": "01 — Génesis",
  "summary": "Entra gratis. Sin compromiso. Descubre si esta comunidad de psicólogos es para ti.",
  "description": "Esto es para ti si:\n\n- Recién egresaste y necesitas guía, comunidad y un camino claro.\n- Tienes consulta presencial y quieres atender en digital sin perder calidad clínica.\n- Ya atiendes online pero todo se siente desordenado.\n\n**Sin costo. Sin compromiso.** Entras, ves, decides.\n\nMotusDAO es un espacio de formación, comunidad y herramientas para psicólogos que quieren ejercer con claridad en entornos digitales. Génesis es el punto de partida: te orientas y ves el mapa — el resto, cuando tú quieras.\n\nDocs a fondo: [Ruta para Profesional de la Salud Mental PSM](https://motusdao.gitbook.io/motusdao-para-psicologos).",
  "category": "Ruta PSM",
  "difficulty": "beginner",
  "isPublished": true,
  "isFree": true,
  "priceCurrency": "USD",
  "instructor": "MotusDAO",
  "instructorTitle": "Academia de Psicología Digital",
  "learningOutcomes": [
    "Saber si MotusDAO encaja contigo.",
    "Entender que Génesis es gratis y sin compromiso.",
    "Ubicar los 5 bloques sin ahogarte en precios.",
    "Conocer el manifiesto y las herramientas de la ruta.",
    "Tener claro tu siguiente paso hacia Fundamentos."
  ],
  "modules": [
    {
      "id": "module_genesis_bienvenida",
      "title": "Empieza aquí",
      "summary": "Sin costo, sin compromiso. Orientación y mapa de la ruta.",
      "order": 1,
      "lessons": [
        {
          "id": "lesson_genesis_bienvenida-motusdao",
          "title": "Esto es para ti",
          "slug": "esto-es-para-ti",
          "order": 1,
          "duration": 6,
          "isFreePreview": true,
          "summary": "Sin costo, sin compromiso. Entras, ves, decides.",
          "contentMDX": "# Esto es para ti\n\n![ChatGPT Image Aug 11, 2026, 02_07_24 AM](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_bienvenida-motusdao/images/cmspqga1p0b823358cb2f6955.png)\n\nSi eres psicólogo y llegaste hasta aquí, probablemente te reconoces en al menos una de estas:\n\n- **Recién egresaste** y no sabes por dónde empezar. Necesitas guía, comunidad y un camino claro que no te deje improvisando.\n- **Tienes consulta presencial** pero quieres atender en digital. Sin perder calidad clínica, sin volverte experto en tecnología.\n- **Ya atiendes online** pero todo es desordenado. Pacientes que no llegan, herramientas que no conectan, encuadre que se siente improvisado.\n\n**Sin costo. Sin compromiso.** Entras, ves y decides si esto es para ti.\n\n## Qué es MotusDAO (en corto)\n\nMotusDAO es un ecosistema de psicólogos que decidieron no esperar a que el sistema se actualice. Aquí encuentras formación clínica, comunidad real con supervisión, y herramientas digitales de próxima generación para tu consulta — no necesitas conocimiento avanzado en tecnología.\n\n## Qué vas a hacer en Génesis\n\nEn este bloque gratuito vas a:\n\n1. **Orientarte** — entender qué es esto y para quién es.\n2. **Ver el mapa** — los 5 bloques de la ruta (introducción sencilla)\n3. **Conocer los espacios** — comunidad, supervisión, herramientas.\n\nCuando termines, sabrás si quieres seguir con el proceso para ser un Profesional de la Salud Mental (PSM) de MotusDAO.\n\n## Mientras exploras\n\nPuedes **crear tu perfil profesional gratis** desde ya (sin pagar). Revisamos perfiles de forma continua: mientras más completo esté el tuyo, más fácil es que te invitemos a entrevista o a un **pase acelerado** cuando quieras activarte en la ruta.\n\nNo tienes que decidir todo hoy. Solo no dejes el perfil a medias si esto te está resonando.\n\n**Siguiente paso:** abre la siguiente lección. Te toma unos minutos.\n\n![image](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_bienvenida-motusdao/images/cmspqglfr0b8265815b765c0d.png)"
        },
        {
          "id": "lesson_genesis_mapa-ruta",
          "title": "Tu mapa — solo lo que necesitas saber hoy",
          "slug": "tu-mapa-hoy",
          "order": 2,
          "duration": 7,
          "isFreePreview": true,
          "summary": "Cinco bloques. Un camino. Tú decides hasta dónde llegar.",
          "contentMDX": "# Tu mapa — solo lo que necesitas saber hoy\n\n![Bloque Genesis imagen ](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_mapa-ruta/images/cmspqls170b8235ce4b0a985c.png)\n\nEsto es todo lo que tienes que saber por ahora:\n\n**Génesis (gratis) → Fundamentos → Praxis → Validación → Portal**\n\nAvanzas cuando tú quieras. No hay prisa, no hay examen de entrada.\n\n- **Génesis** ← estás aquí. Gratis, sin compromiso. Te orientas.\n- **Fundamentos** — el siguiente paso. Aprendes a montar tu práctica digital con encuadre clínico. Sin improvisar, sin perder pacientes en el intento. $20/mes.\n- **Praxis** — espacio clínico con herramientas, supervisión y consultorio virtual.\n- **Validación** — evaluación y validación / constancia de competencias.\n- **Portal** — tu consultorio digital funcionando.\n\nLos bloques 3, 4 y 5 los ves cuando llegues. No necesitas saberlo todo hoy.\n\n![mapa de academia metaverso](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_mapa-ruta/images/cmspqodrt0b8205496d30c53c.png)\n\n## Tu primera semana en MotusDAO\n\nEn los próximos 7 días vas a:\n\n1. Orientarte en Génesis (este bloque) y decidir si resuena contigo.\n2. Conocer la **comunidad** — nos reunimos por Telegram y en el metaverso. El enlace te lo compartimos más adelante en la ruta.\n3. Explorar el mapa del PSM y, si quieres, pasar a Fundamentos.\n\nSin pagar un peso.\n\n## ¿Quieres profundizar?\n\nSi eres de los que lee los manuales completos antes de empezar, aquí tienes la documentación a fondo:\n\n[Ruta del Profesional de la Salud Mental (PSM) →](https://motusdao.gitbook.io/motusdao-para-psicologos)\n\n**Siguiente paso:** cuando estés listo, Fundamentos te espera."
        }
      ]
    },
    {
      "id": "module_genesis_profundizar",
      "title": "Si quieres entender más",
      "summary": "Manifiesto y herramientas — lectura opcional para decidir con claridad.",
      "order": 2,
      "lessons": [
        {
          "id": "lesson_genesis_manifiesto",
          "title": "Manifiesto — para quien quiere entender de qué va esto",
          "slug": "manifiesto",
          "order": 1,
          "duration": 5,
          "isFreePreview": true,
          "summary": "No somos una plataforma de cursos. Esto es lo que defendemos.",
          "contentMDX": "# Manifiesto — Own Your Data\n\nLa salud mental está siendo digitalizada. Eso ya pasó. No hay vuelta atrás. La pregunta es quién define las reglas y cómo evitamos la extracción de datos sensibles.\n\nHoy, la mayoría de las herramientas digitales para psicólogos las construyen empresas tech que nunca han estado en una sesión clínica. Sus prioridades son retención, engagement y datos del usuario. Las tuyas son encuadre, transferencia y ética. Esas dos lógicas no siempre se alinean.\n\nMotusDAO existe para que los psicólogos tengan un espacio digital construido desde la clínica, no desde el producto.\n\nEsto significa:\n\n- **Las herramientas se adaptan a tu método**, no al revés. No necesitas cambiar cómo trabajas para usar la plataforma.\n- **La comunidad no es un feature**, es el centro. Supervisión entre colegas, discusión de casos y construcción colectiva de conocimiento — en Telegram y en encuentros en el metaverso (el acceso te lo damos más adelante).\n- **La ruta es tuya.** Entras por donde quieras, avanzas a tu ritmo, pagas solo lo que usas. No hay embudos diseñados para atraparte.\n- **Lo abierto gana.** Preferimos estándares abiertos, datos que te pertenecen y gobierno de la comunidad profesional sobre decisiones que afectan tu práctica.\n\nNo somos una startup que busca escalar a toda costa. Somos una red de psicólogos construyendo las herramientas que necesitamos para ejercer en digital con el mismo rigor que en presencial. **Hecha por psicólogos, para psicólogos.**\n\nSi eso te resuena, este es tu lugar. Si no, también está bien — al menos sabes que existe.\n\n[Leer el Manifiesto completo →](https://motusdao.gitbook.io/manifiesto)"
        },
        {
          "id": "lesson_genesis_lo-que-hay-dentro",
          "title": "Lo que hay dentro — herramientas que acompañan tu ruta profesional",
          "slug": "lo-que-hay-dentro",
          "order": 2,
          "duration": 8,
          "isFreePreview": true,
          "summary": "Perfil, agenda, consultorio, MotusAI, academia y pagos: lo que ya puedes usar en la app.",
          "contentMDX": "# Lo que hay dentro — herramientas que acompañan la ruta\n\n![Screenshot herramientas Hub](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_lo-que-hay-dentro/images/cmspsgqi40b82bd1fefcacd82.png)\n\nGénesis es la puerta. Esto es lo que **ya está listo** en la app del Hub para ti como profesional.\n\n## Tu perfil profesional y reputación online\n\nEn **Perfil** armas tu identidad clínica: especialidades, bio, capacidad de atención. Esa misma información alimenta tu presencia pública en **Psicoterapia**, donde las personas pueden conocerte y agendar. Puedes sumar certificados para ganar más confianza en el ecosistema.\n\n## Disponibilidad y citas\n\nEn **Disponibilidad** publicas tus horarios. Cuando alguien reserva, se crea el emparejamiento. Tú controlas tus horarios; la app hace el resto del puente.\n\n## Consultorio virtual\n\nDesde **Videochat** (y desde Perfil → abrir consultorio) tienes salas seguras de videollamada: el paciente entra desde el celular, sin instalar nada, con un link único. Cada vínculo de atención puede operar por **app** o en el **metaverso**.\n\n## MotusAI\n\nEn **MotusAI** tienes un asistente orientado a profesionales clínicos de MotusDAO: preguntas sobre el ecosistema, los cursos y apoyo para pensar casos (incluye un modo supervisor experimental). **No sustituye tu juicio clínico** ni es una historia clínica.\n\n## Academia\n\nLo que estás leyendo ahora. Catálogo de bloques, lecciones, progreso y (cuando aplique) membresías. Arrancas en Génesis gratis; Fundamentos y lo que sigue aparecen cuando quieras avanzar.\n\n## Comunidad profesional\n\nLa vida de la comunidad — colegas, casos, acompañamiento — ocurre en **Telegram** y en **reuniones en el metaverso**. No es un chat que se apaga a los tres días. El enlace de acceso te lo compartimos más adelante en la ruta.\n\n## Pagos\n\nEn **Pagos** manejas tu propia cuenta dentro del Hub para enviar y recibir. MotusDAO **no se queda con tu dinero**: tú controlas tus fondos y eliges cómo retirarlos con proveedores de confianza. Sin intermediarios ocultos ni “caja negra”.\n\n## Matching (usuarios ↔ PSM)\n\nEl sistema conecta perfiles y agendas. Hoy ves tus emparejamientos activos desde **Perfil**. Usa Perfil como fuente de verdad mientras afinamos la bandeja “Mis usuarios”.\n\n---\n\n## Próximamente\n\nLo esencial ya está. Esto es lo que viene después (sin prisa):\n\n- Historia clínica por paciente, integrada al consultorio\n- Memoria / resumen inteligente de sesiones\n- Más agentes de apoyo para tu práctica\n\nSomos una plataforma en evolución constante, con foco en salud mental.\n\n---\n\n## Tu siguiente paso (gratis)\n\nSi MotusDAO te hace sentido, no esperes a “estar listo del todo”:\n\n1. **Crea tu perfil profesional gratis** en el Hub (completo: bio, especialidades, documentos cuando aplique).\n2. **Lo revisamos** de forma continua. Los perfiles claros y serios pueden pasar a **entrevista** o a un **pase acelerado** hacia validación / visibilidad.\n3. Cuando tú decidas avanzar, **Fundamentos** y la activación en la ruta te abren la operación real (incluyendo aparecer donde corresponde en Psicoterapia).\n\nCrear el perfil **no implica pago**. El pago entra cuando eliges activar tu lugar en la ruta — no para “comprar ser elegido”.\n\n**¿Sabes ya si MotusDAO es para ti?**  \nSi sí: perfil + Fundamentos. Si necesitas más tiempo, sigue explorando — y vuelve cuando quieras."
        }
      ]
    }
  ]
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
