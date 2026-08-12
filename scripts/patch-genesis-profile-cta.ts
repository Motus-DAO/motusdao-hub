import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { lockCourseToSeed } from '../lib/academy/lock-course-to-seed'

config({ path: '.env.local' })
config()

const prisma = new PrismaClient()

const L1 = `# Esto es para ti

![ChatGPT Image Aug 11, 2026, 02_07_24 AM](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_bienvenida-motusdao/images/cmspqga1p0b823358cb2f6955.png)

Si eres psicólogo y llegaste hasta aquí, probablemente te reconoces en al menos una de estas:

- **Recién egresaste** y no sabes por dónde empezar. Necesitas guía, comunidad y un camino claro que no te deje improvisando.
- **Tienes consulta presencial** pero quieres atender en digital. Sin perder calidad clínica, sin volverte experto en tecnología.
- **Ya atiendes online** pero todo es desordenado. Pacientes que no llegan, herramientas que no conectan, encuadre que se siente improvisado.

**Sin costo. Sin compromiso.** Entras, ves y decides si esto es para ti.

## Qué es MotusDAO (en corto)

MotusDAO es un ecosistema de psicólogos que decidieron no esperar a que el sistema se actualice. Aquí encuentras formación clínica, comunidad real con supervisión, y herramientas digitales de próxima generación para tu consulta — no necesitas conocimiento avanzado en tecnología.

## Qué vas a hacer en Génesis

En este bloque gratuito vas a:

1. **Orientarte** — entender qué es esto y para quién es.
2. **Ver el mapa** — los 5 bloques de la ruta (introducción sencilla)
3. **Conocer los espacios** — comunidad, supervisión, herramientas.

Cuando termines, sabrás si quieres seguir con el proceso para ser un Profesional de la Salud Mental (PSM) de MotusDAO.

## Mientras exploras

Puedes **crear tu perfil profesional gratis** desde ya (sin pagar). Revisamos perfiles de forma continua: mientras más completo esté el tuyo, más fácil es que te invitemos a entrevista o a un **pase acelerado** cuando quieras activarte en la ruta.

No tienes que decidir todo hoy. Solo no dejes el perfil a medias si esto te está resonando.

**Siguiente paso:** abre la siguiente lección. Te toma unos minutos.

![image](https://ryjkpaiknsnjyydxwugl.supabase.co/storage/v1/object/public/academy-courses/course_genesis_clinica_digital/lesson_genesis_bienvenida-motusdao/images/cmspqglfr0b8265815b765c0d.png)`

const L4 = `# Lo que hay dentro — herramientas que acompañan la ruta

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

## Comunidad profesional

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

## Tu siguiente paso (gratis)

Si MotusDAO te hace sentido, no esperes a “estar listo del todo”:

1. **Crea tu perfil profesional gratis** en el Hub (completo: bio, especialidades, documentos cuando aplique).
2. **Lo revisamos** de forma continua. Los perfiles claros y serios pueden pasar a **entrevista** o a un **pase acelerado** hacia validación / visibilidad.
3. Cuando tú decidas avanzar, **Fundamentos** y la activación en la ruta te abren la operación real (incluyendo aparecer donde corresponde en Psicoterapia).

Crear el perfil **no implica pago**. El pago entra cuando eliges activar tu lugar en la ruta — no para “comprar ser elegido”.

**¿Sabes ya si MotusDAO es para ti?**  
Si sí: perfil + Fundamentos. Si necesitas más tiempo, sigue explorando — y vuelve cuando quieras.`

async function main() {
  const now = new Date()
  await prisma.lesson.update({
    where: { id: 'lesson_genesis_bienvenida-motusdao' },
    data: { contentMDX: L1, updatedAt: now },
  })
  await prisma.lesson.update({
    where: { id: 'lesson_genesis_lo-que-hay-dentro' },
    data: { contentMDX: L4, updatedAt: now },
  })

  const course = await prisma.course.findUnique({ where: { slug: '01-genesis' } })
  if (!course) throw new Error('missing genesis')
  const result = await lockCourseToSeed(prisma, course.id)
  console.log('✅ DB + lock', result.writtenPaths.join(', '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
