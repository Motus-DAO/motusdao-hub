/**
 * Upsert Bloque 02 — Fundamentos to DB only (no seed file write, no push).
 * Structure from Hermes: 2 modules / 5 lessons, conversion-focused.
 */
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { upsertAcademyCourse, type SeedCourse } from '../prisma/data/academy-seed-shared'

config({ path: '.env.local' })
config()

const prisma = new PrismaClient()

const FUNDAMENTOS_DB: SeedCourse = {
  id: 'course_02_fundamentos',
  slug: '02-fundamentos',
  title: '02 — Fundamentos',
  summary:
    'Deja de improvisar tu consulta online: encuadre, herramientas justas, ética clara y colegas que entienden el trabajo clínico. USD 20/mes.',
  description: `**Fundamentos** es la Membresía de Práctica Digital (USD 20/mes · 120/año).

Si estás listo para dejar de improvisar tu consulta online, aquí organizas tu práctica con una ruta corta y accionable: encuadre listo, herramientas que sí usas, ética digital, un perfil que atrae a los pacientes correctos, y una **comunidad de colegas** (Telegram y encuentros) que entiende el trabajo clínico — no un curso aislado tipo Udemy.

Lo esencial ya está. El resto lo activas a tu ritmo.`,
  category: 'Membresía',
  difficulty: 'beginner',
  isPublished: true,
  isFree: false,
  priceAmount: 20,
  priceCurrency: 'USD',
  instructor: 'MotusDAO',
  instructorTitle: 'Academia de Psicología Digital',
  learningOutcomes: [
    'Redactar un encuadre mínimo para atención en línea.',
    'Elegir solo las herramientas digitales que necesitas.',
    'Definir límites, crisis y consentimiento digital.',
    'Armar un perfil profesional claro y ético.',
    'Completar un plan de 7 días hacia Praxis.',
  ],
  modules: [
    {
      id: 'module_02_fundamentos_clinica',
      title: 'Tu consulta online en marcha',
      summary: 'Encuadre, herramientas y ética digital — lo mínimo para operar con claridad.',
      order: 1,
      lessons: [
        {
          id: 'lesson_02_fundamentos_encuadre',
          title: 'Tu encuadre listo en 20 minutos',
          slug: 'tu-encuadre-listo',
          order: 1,
          duration: 20,
          isFreePreview: true,
          summary: 'Espacio, tiempo, confidencialidad y presencia digital — con ejercicio de ½ página.',
          contentMDX: `# Tu encuadre listo en 20 minutos

Si tu consulta online se siente improvisada, casi siempre falta **encuadre**: las reglas claras de cómo, cuándo y con qué límites ocurre la atención.

Hoy sales con un borrador usable. No con teoría.

## Los 4 pilares (mínimo viable)

### **1. Espacio**
- Privacidad razonable para ti y para la persona.
- Auriculares cuando haga falta; fondo y ruido bajo control.
- Si no puedes garantizar privacidad ese día, **reprograma** — no “improvises la sesión”.

### **2. Tiempo**
- Duración (ej. 50 minutos).
- Zona horaria visible.
- Política de cancelación / retraso (ej. 24 h).
- Qué pasa si falla internet a mitad de sesión.

### **3. Confidencialidad**
- Quién puede ver u oír (nadie más en la habitación, en lo posible).
- Cómo guardas notas y grabaciones (si las hay).
- Límites de WhatsApp / mensajes fuera de sesión.

### **4. Presencia digital**
- Cámara a la altura de los ojos, luz frontal suave.
- Mismo enlace o flujo de entrada cada vez.
- Plan B si la plataforma falla (otro link o reprogramar).

## Ejercicio (10 minutos)

Redacta tu **encuadre mínimo en media página**. Copia y completa:

\`\`\`
Encuadre — atención en línea

Modalidad: videollamada
Duración:
Zona horaria:
Cancelación / retraso:
Privacidad (espacio):
Confidencialidad y notas:
Contacto entre sesiones:
Qué hago si hay falla técnica:
Situaciones que no atiendo / derivo:
\`\`\`

## Plantilla de encuadre

Usa el bloque de arriba como plantilla. Guárdala en tus notas o en tu Perfil MotusDAO.  
*(Si más adelante publicamos PDF descargable, te avisamos en la membresía.)*

**Siguiente lección:** solo las herramientas que sí necesitas — sin ruido técnico.`,
        },
        {
          id: 'lesson_02_fundamentos_herramientas',
          title: 'Herramientas que sí necesitas (y solo esas)',
          slug: 'herramientas-que-si-necesitas',
          order: 2,
          duration: 20,
          isFreePreview: false,
          summary: 'Consultorio, agenda, notas, pagos internacionales e IA de apoyo — sin complicarte.',
          contentMDX: `# Herramientas que sí necesitas (y solo esas)

No necesitas diez apps. Necesitas un **set corto** que sostenga tu práctica sin volverte “experto tech”.

## **1. Consultorio virtual (desde el navegador)**

Atiende por videollamada sin que el paciente instale nada raro: entra con un link, desde el celular o la computadora.

En MotusDAO lo abres desde **Videochat** / **Perfil → abrir consultorio**. Misma lógica cada sesión: menos fricción, más profesionalismo.

## **2. Agenda + recordatorios + cancelación**

- Publica horarios en **Disponibilidad**.
- Deja clara tu política de cancelación (la del encuadre).
- Recordatorios: aunque sea un mensaje manual al inicio; después puedes sistematizar.

Si no hay agenda visible, la consulta online se vuelve caos.

## **3. Notas clínicas (mínimos de seguridad)**

- Guarda lo mínimo necesario para dar seguimiento.
- Evita apps personales sin control de acceso.
- No dejes notas en chats sueltos.
- Separa lo clínico de lo administrativo.

Aún sin historia clínica completa en la app, **tu estándar ético** ya aplica.

## **4. Pagos internacionales**

Si atiendes personas en otros países:

- Define moneda y forma de cobro **antes** de la primera sesión.
- Evita mezclar cuentas personales sin rastro.
- En el Hub, **Pagos** te permite manejar tu propia cuenta: MotusDAO no se queda con tu dinero; tú controlas fondos y retiros con proveedores de confianza.

No es “cripto por moda”: es poder cobrar con claridad cuando tu paciente no está en tu mismo país.

## **5. IA como apoyo (no sustituto)**

Usa IA para:

- ordenar ideas post-sesión,
- redactar borradores de encuadre o mensajes,
- estudiar temas.

No uses IA para:

- diagnosticar por ti,
- reemplazar tu juicio clínico,
- pegar datos identificables del paciente en herramientas inseguras.

En MotusDAO tienes **MotusAI** orientado a profesionales — siempre con el mismo límite: **tú decides**.

---

**Checklist rápido**

- [ ] Sé abrir mi consultorio y enviar el link
- [ ] Tengo horarios publicados
- [ ] Sé dónde guardo notas con privacidad
- [ ] Sé cómo voy a cobrar (incluido internacional si aplica)
- [ ] Tengo regla clara de qué sí / no pido a la IA

**Siguiente lección:** ética digital — crisis, límites y consentimiento.`,
        },
        {
          id: 'lesson_02_fundamentos_limites',
          title: 'Ética digital: crisis, límites y consentimiento',
          slug: 'etica-digital-crisis-limites',
          order: 3,
          duration: 20,
          isFreePreview: false,
          summary: 'Protocolo de crisis, derivación, consentimiento informado digital y límites claros.',
          contentMDX: `# Ética digital: crisis, límites y consentimiento

En digital, la ética no es un anexo: es parte del encuadre. Aquí lo dejas escrito y operable.

> La formación MotusDAO no sustituye tu cédula ni tu juicio clínico.

## **1. Qué sí atiendes (y qué no)**

Define con honestidad:

- Poblaciones y temas donde tienes competencia.
- Casos que **derivas** (ej. crisis aguda sin red de apoyo, necesidades fuera de tu alcance).
- Modalidad: solo video / no atención por chat terapéutico infinito.

Escríbelo en 5 líneas. Si no cabe en 5, todavía no está claro.

## **2. Protocolo ante crisis e ideación**

Antes de que pase:

1. Cómo detectas señales de riesgo en sesión.
2. Qué dices (lenguaje directo, sin alarmismo vacío).
3. A quién derivas / líneas locales de emergencia (según jurisdicción).
4. Qué registras y a quién contactas si hay riesgo inminente (según norma aplicable).
5. Cuándo **no** continúas solo en video y pasas a red presencial/urgente.

Si no tienes protocolo, no improvises en el peor momento.

## **3. Consentimiento informado digital**

La persona debe entender, como mínimo:

- Modalidad (videollamada), duración y honorarios.
- Límites de confidencialidad.
- Riesgos técnicos (cortes, privacidad del entorno).
- Política de cancelación.
- Que no es un servicio de emergencia 24/7 (si así lo defines).

### Plantilla corta (adapta a tu jurisdicción)

\`\`\`
Consentimiento — atención psicológica en línea

He sido informado/a de: modalidad, duración, honorarios,
límites de confidencialidad, riesgos técnicos y política de cancelación.
Entiendo que este espacio no sustituye servicios de emergencia.
Nombre / fecha / aceptación:
\`\`\`

## **4. Límites en mensajería**

- Horario de respuesta.
- Qué temas no se trabajan por WhatsApp.
- Qué pasa con audios, capturas y reenvíos.

Sin límites, el “siempre disponible” te quema y baja la calidad clínica.

---

**Ejercicio:** escribe tu protocolo de crisis en media página + pega tu consentimiento mínimo.

**Siguiente módulo:** perfil que atrae a los pacientes correctos + plan de 7 días.`,
        },
      ],
    },
    {
      id: 'module_02_fundamentos_perfil',
      title: 'Presencia y comunidad',
      summary: 'Perfil profesional claro y plan de 7 días hacia Praxis.',
      order: 2,
      lessons: [
        {
          id: 'lesson_02_fundamentos_perfil',
          title: 'Tu perfil profesional que atrae a los pacientes correctos',
          slug: 'perfil-que-atrae-pacientes-correctos',
          order: 1,
          duration: 20,
          isFreePreview: false,
          summary: 'Narrativa, enfoque, modalidad y encuadre visible — sin promesas vacías.',
          contentMDX: `# Tu perfil profesional que atrae a los pacientes correctos

Un buen perfil no “vende magia”. **Filtra**: acerca a quien sí puedes acompañar y aleja expectativas irreales.

## **1. Narrativa: quién eres y cómo acompañas**

En 2–4 frases:

- Formación y enfoque (sin currículo eterno).
- Cómo trabajas (claro, humano, clínico).
- Para quién es tu espacio.

Evita prometer resultados (“cura”, “garantizado”, “en X sesiones”).

## **2. Enfoque con honestidad**

Lista:

- Temas / problemáticas.
- Poblaciones.
- Lo que **no** atiendes.

La honestidad ahorra malas primeras sesiones.

## **3. Modalidad MotusDAO**

Deja visible:

- Atención por video en MotusDAO.
- Idioma(s).
- Países / zonas horarias que sí puedes cubrir.

## **4. Encuadre visible**

En el perfil (o en el primer contacto) que se entienda:

- Urgencias: no eres línea 24/7 (si aplica).
- Cancelaciones.
- Confidencialidad básica.

## Plantilla de perfil (cópiala)

\`\`\`
Nombre profesional
Enfoque / cómo acompañas (3–4 líneas)
Temas y poblaciones
Modalidad: videollamada (MotusDAO)
Idiomas / zona horaria
Encuadre breve: duración, cancelación, límites de emergencia
Lo que no ofrezco:
\`\`\`

Complétala en **Perfil** del Hub. Un perfil completo también ayuda si más adelante hay revisión o pase acelerado en la ruta.

**Siguiente lección:** qué incluye tu membresía + plan de 7 días hacia Praxis.`,
        },
        {
          id: 'lesson_02_fundamentos_plan-30',
          title: 'Tu membresía activa + plan 7 días hacia Praxis',
          slug: 'membresia-activa-plan-7-dias',
          order: 2,
          duration: 25,
          isFreePreview: false,
          summary:
            'Membresía, cobros internacionales, PsyChat, plan de 7 días y checklist de activación (puerta a Praxis).',
          contentMDX: `# Tu membresía activa + plan 7 días hacia Praxis

Ya no es “aprender más teoría”. Es **poner en marcha** tu práctica digital.

## Dos capas (para que no te confundas)

1. **Lecciones 1–4** — aprendes a montar tu consulta online (encuadre, herramientas, ética, perfil). Sirve aunque atiendas fuera de MotusDAO.
2. **Esta lección (bonus operativo)** — si además quieres **operar dentro de MotusDAO** (recibir usuarios en el Hub), aquí activas membresía, cobros, PsyChat y el checklist de Benjamin.

El checklist **no reemplaza** Fundamentos: lo **extiende** hacia la acción y es tu puerta a Praxis / recibir pacientes.

## ¿Qué tienes con Fundamentos?

Con la Membresía de Práctica Digital (USD 20/mes · 120/año):

- Esta ruta corta de Academia (encuadre, herramientas, ética, perfil).
- Herramientas del Hub: **perfil, agenda, consultorio virtual, pagos**.
- **Cobros internacionales** — recibir de pacientes en otros países con claridad (MotusDAO no se queda con tu dinero; tú controlas fondos y retiros).
- **PsyChat** — asistente de apoyo clínico (en el Hub aparece como MotusAI): ordenar ideas, preparar intervenciones, pensar casos. **No sustituye tu juicio clínico** ni usa datos identificables del paciente a la ligera.
- Base para comunidad y para entrar a **Praxis** con menos improvisación.

No es un curso eterno. Es el piso firme antes de talleres y supervisión práctica.

## Plan de 7 días (quick win)

### **Día 1 — Encuadre**
Escribe tu encuadre mínimo (lección 1) y guárdalo.

### **Día 2 — Límites y derivación**
Define qué sí / no atiendes + borrador de protocolo de crisis.

### **Día 3 — Perfil**
Publica tu perfil profesional completo en el Hub (bio, especialidades, documentos cuando aplique).

### **Día 4 — Consultorio**
Prueba videollamada: link, cámara, audio, privacidad, plan B.

### **Día 5 — Agenda**
Configura **Disponibilidad**, prueba una reserva y deja clara tu política de cancelación.

### **Día 6 — Cobros + PsyChat**
- Define tarifas y cómo cobras — **incluido internacional** si aplica.
- Entra a PsyChat / MotusAI y haz una prueba con un caso **ficticio** (sin datos reales de pacientes).

### **Día 7 — Checklist + Praxis**
Completa el **Checklist de Activación Clínica** (abajo) y elige tu primer taller en Praxis.

---

## Bonus — Checklist de Activación Clínica MotusDAO

*Material complementario (Benjamin): solo si quieres operar y recibir usuarios dentro de MotusDAO.*

Cumple estos puntos para activar tu perfil y comenzar a recibir usuarios en el consultorio virtual. Si faltan, el perfil no se activa para matching.

**Inicia tu clínica:** Tu Consultorio · Tu Agenda · Tu Perfil Profesional · Cobros · PsyChat · Expediente Clínico

| # | Criterio | ¿Listo? |
|---|---|---|
| 1 | Perfil profesional completo y actualizado en MotusDAO | ☐ |
| 2 | Formación y documentación profesional cargada | ☐ |
| 3 | Consultorio virtual configurado y sabes usarlo | ☐ |
| 4 | Probaste cámara, audio y privacidad del espacio clínico | ☐ |
| 5 | Agenda configurada, probada y lista para reservas | ☐ |
| 6 | Conoces el flujo de aceptación, referencia y derivación | ☐ |
| 7 | Sabes usar el expediente clínico y registrar lo básico del caso | ☐ |
| 8 | Cuenta activa en PsyChat y conoces su uso como apoyo clínico | ☐ |
| 9 | Comprendes cobros, tarifas y continuidad terapéutica (incl. internacional) | ☐ |
| 10 | Hiciste una simulación completa de evaluación clínica en el sistema | ☐ |

### Resultado

- ☐ **APTO PARA RECIBIR PACIENTES**
- ☐ **NO** — completa primero los puntos en “No”

Cuando termines el checklist, escribe **"termine checklist"** a [contact@motusdao.org](mailto:contact@motusdao.org).

Documentación ampliada: [Fundamentos en GitBook — MotusDAO para Psicólogos](https://motusdao.gitbook.io/motusdao-para-psicologos/bloque-fundamentos).

---

## Tu siguiente paso

Si completaste (o estás en) este plan, no te quedes en Fundamentos como meta final.

**Completa estos 10 items y estás listo para el puente a Praxis** — talleres prácticos y supervisión aplicada, desde **USD 15**.

Ahí dejas de solo “organizar” y empiezas a **entrenar** con casos, colegas y práctica real.

Cuando estés listo: ve al bloque **03 — Praxis** y elige tu primer taller.`,
        },
      ],
    },
  ],
}

async function main() {
  const course = await upsertAcademyCourse(prisma, FUNDAMENTOS_DB)
  // Keep billing interval sensible for membership if column exists
  await prisma.course.update({
    where: { id: course.id },
    data: {
      billingInterval: 'monthly',
      updatedAt: new Date(),
    },
  })
  console.log(`✅ Fundamentos DB: ${course.slug}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
