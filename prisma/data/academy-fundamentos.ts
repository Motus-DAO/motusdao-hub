import type { PrismaClient } from '@prisma/client'
import { upsertAcademyCourse, type SeedCourse } from './academy-seed-shared'

/**
 * Bloque 02 — Fundamentos + Membresía de Práctica Digital.
 * Canonical seed (aligned with Hub product surfaces). Upsert via scripts/upsert-fundamentos-db.ts.
 */
export const FUNDAMENTOS_COURSE: SeedCourse = {
  id: 'course_02_fundamentos',
  slug: '02-fundamentos',
  title: '02 — Fundamentos',
  summary:
    'Deja de improvisar tu consulta online: encuadre, herramientas justas, ética clara y colegas que entienden el trabajo clínico. USD 20/mes.',
  description: `**Fundamentos** es la Membresía de Práctica Digital (USD 20/mes · 120/año).

Si estás listo para dejar de improvisar tu consulta online, aquí organizas tu práctica con una ruta corta y accionable: encuadre listo, herramientas que sí usas, ética digital, un perfil que atrae a los pacientes correctos, y una **comunidad de colegas** (Telegram y encuentros) que entiende el trabajo clínico.

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
    'Encuadre online para atención en línea.',
    'Usar o acceder al consultorio virtual.',
    'Aperturar agenda y disponibilidad.',
    'Usar notas clínicas con mínimos de seguridad.',
    'Saber cómo cobrar internacionalmente.',
    'Usar IA como copiloto (sin sustituir tu juicio clínico).',
    'Perfil profesional con visibilidad.',
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

Guárdala en tus notas o en tu Perfil MotusDAO.

**Siguiente lección:** ejercicios reales en la plataforma — consultorio, agenda y PsyChat.`,
        },
        {
          id: 'lesson_02_fundamentos_herramientas',
          title: 'Herramientas que sí necesitas (y solo esas)',
          slug: 'herramientas-que-si-necesitas',
          order: 2,
          duration: 25,
          isFreePreview: false,
          summary: 'Ejercicios en el Hub: consultorio, agenda, PsyChat, notas, cobros e IA.',
          contentMDX: `# Herramientas que sí necesitas (y solo esas)

No necesitas diez apps. Necesitas un **set corto** que sostenga tu práctica sin volverte “experto tech”.

Haz estos tres ejercicios en la plataforma. Son el mínimo para operar:

---

## Ejercicio 1 — Abrir tu consultorio (Videochat)

Atiende por videollamada sin que el paciente instale nada: entra con un link, desde el celular o la computadora.

1. Abre **[Videochat / consultorio](/videochat)**.
2. Genera o copia el enlace de tu sala.
3. Prueba cámara, audio y privacidad del espacio.

<img src="/academy/product/hub-videochat.jpg" alt="Consultorio virtual — Videochat en el Hub" class="academy-product-shot" />

**Listo cuando:** sabes abrir el consultorio y enviar el link en menos de un minuto.

---

## Ejercicio 2 — Publicar un horario en la agenda

Si no hay agenda visible, la consulta online se vuelve caos.

1. Abre **[Disponibilidad](/disponibilidad)**.
2. Publica al menos un horario realista.
3. Deja clara tu política de cancelación (la del encuadre).

<img src="/academy/product/hub-casos.png" alt="Agenda y seguimiento en el Hub" class="academy-product-shot" />

**Listo cuando:** tienes horarios publicados y sabes cómo se vería una reserva.

---

## Ejercicio 3 — Una consulta de prueba con PsyChat

**PsyChat** (en el Hub aparece como **MotusAI**) es tu copiloto: ordenar ideas, preparar intervenciones, pensar casos. **No sustituye tu juicio clínico.**

1. Abre **[PsyChat / MotusAI](/motusai)**.
2. Haz una consulta con un caso **ficticio** (sin datos reales de pacientes).
3. Guarda una regla personal: qué sí / no le pides a la IA.

**Listo cuando:** usaste PsyChat una vez con un caso inventado y sabes sus límites.

---

## También necesitas (mínimos)

### Notas clínicas
- Guarda lo mínimo necesario para dar seguimiento.
- Evita apps personales sin control de acceso.
- No dejes notas en chats sueltos.

### Cobros internacionales
- Define moneda y forma de cobro **antes** de la primera sesión.
- En el Hub, **Pagos** te permite manejar tu propia cuenta: MotusDAO no se queda con tu dinero.

### IA como copiloto
- Sí: ordenar ideas, borradores, estudiar.
- No: diagnosticar por ti, reemplazar tu juicio, pegar datos identificables en herramientas inseguras.

---

**Checklist rápido**

- [ ] Abrí mi consultorio y copié el link → [/videochat](/videochat)
- [ ] Publiqué horarios → [/disponibilidad](/disponibilidad)
- [ ] Hice una prueba en PsyChat → [/motusai](/motusai)
- [ ] Sé dónde guardo notas con privacidad
- [ ] Sé cómo voy a cobrar (incluido internacional si aplica)

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
- Casos que **derivas**.
- Modalidad: solo video / no atención por chat terapéutico infinito.

Escríbelo en 5 líneas. Si no cabe en 5, todavía no está claro.

## **2. Protocolo ante crisis e ideación**

Antes de que pase:

1. Cómo detectas señales de riesgo en sesión.
2. Qué dices (lenguaje directo, sin alarmismo vacío).
3. A quién derivas / líneas locales de emergencia (según jurisdicción).
4. Qué registras y a quién contactas si hay riesgo inminente (según norma aplicable).
5. Cuándo **no** continúas solo en video y pasas a red presencial/urgente.

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

---

**Ejercicio:** escribe tu protocolo de crisis en media página + pega tu consentimiento mínimo.

**Siguiente módulo:** perfil del Hub — de inicio a fin.`,
        },
      ],
    },
    {
      id: 'module_02_fundamentos_perfil',
      title: 'Presencia y siguiente paso',
      summary: 'Perfil completo en el Hub y puente corto a Praxis.',
      order: 2,
      lessons: [
        {
          id: 'lesson_02_fundamentos_perfil',
          title: 'Dónde termina el perfil del Hub',
          slug: 'perfil-que-atrae-pacientes-correctos',
          order: 1,
          duration: 20,
          isFreePreview: false,
          summary: 'Inicio y fin del registro: pasos claros para un perfil visible y usable.',
          contentMDX: `# Dónde termina el perfil del Hub

Un buen perfil no “vende magia”. **Filtra**: acerca a quien sí puedes acompañar y deja claro cómo trabajas.

Abre **[Perfil](/perfil)** y sigue este recorrido de **inicio → fin**.

<img src="/academy/product/hub-perfil.png" alt="Vista de Perfil en el Hub MotusDAO" class="academy-product-shot" />

## Inicio — qué abres

Entras a **Perfil** en el Hub. Ahí armas tu identidad clínica: datos, bio, especialidades y documentos cuando aplique.

## Pasos del registro (en orden)

1. **Datos básicos** — nombre profesional, contacto, ubicación.
2. **Biografía** — 2–4 frases: quién eres, cómo acompañas, para quién es tu espacio (sin prometer resultados).
3. **Enfoque** — temas, poblaciones y lo que **no** atiendes.
4. **Modalidad** — videollamada en MotusDAO; idioma(s) y zona horaria.
5. **Encuadre visible** — duración, cancelaciones, límites de urgencia / emergencia.
6. **Documentación** — cédula u equivalentes aplicables cuando el flujo lo pida.
7. **Revisión** — lee tu perfil como si fueras un paciente nuevo: ¿queda claro?

## Fin — cuándo está “terminado”

Tu perfil del Hub está **completo** cuando puedes marcar esto:

- [ ] Bio y enfoque publicados (sin promesas vacías)
- [ ] Modalidad y zona horaria visibles
- [ ] Encuadre breve visible (cancelación + límites de emergencia)
- [ ] Documentos cargados cuando apliquen
- [ ] Sabes editar y actualizar el perfil sin ayuda

**Eso es el fin del registro de perfil.** No es Validación ni Portal: es tu presencia profesional lista en el Hub.

## Plantilla rápida (cópiala a Perfil)

\`\`\`
Nombre profesional
Enfoque / cómo acompañas (3–4 líneas)
Temas y poblaciones
Modalidad: videollamada (MotusDAO)
Idiomas / zona horaria
Encuadre breve: duración, cancelación, límites de emergencia
Lo que no ofrezco:
\`\`\`

**Siguiente lección:** qué aprender después — Praxis, supervisión y programas.`,
        },
        {
          id: 'lesson_02_fundamentos_plan-30',
          title: 'Qué sigue: Praxis, supervisión y programas',
          slug: 'membresia-activa-plan-7-dias',
          order: 2,
          duration: 12,
          isFreePreview: false,
          summary: 'Puente corto: qué aprender, supervisión clínica y rutas de programas.',
          contentMDX: `# Qué sigue: Praxis, supervisión y programas

Con Fundamentos ya tienes el piso operativo. Lo que sigue no es más teoría suelta: es **elegir qué aprender** según tu práctica.

## 1. Qué necesitas aprender (Praxis)

En **03 — Praxis** eliges habilidades concretas con cursos y talleres aplicados (casos, ejercicios, criterio clínico).

Rutas típicas:

- Si quieres ordenar mejor lo que escuchas → **Escucha clínica** → **Formulación de casos**
- Si te interesan lenguaje y razonamiento → **Razonamiento clínico** → programa avanzado
- Si te preocupa cómo intervienes → **Ética de la intervención** → supervisión cuando haya caso real

Empieza por **una** necesidad de los próximos 30 días. No por el catálogo completo.

## 2. Supervisión clínica

Cuando un caso real te genera dudas (límites, riesgo, estancamiento, dilema ético), lo que necesitas no es otro video: es **supervisión**.

- Oferta separada de los cursos.
- Referencia: **USD 50 / sesión**.
- Lleva una pregunta concreta, no “dime qué hago con este paciente”.

## 3. Programas y rutas

Si quieres profundizar con un autor o método, Praxis incluye programas de autor.

Primera colección disponible — **Maestro Benjamín Buzali**:

1. Escucha clínica y patrones relacionales — USD 15  
2. Formulación de casos e hipótesis clínicas — USD 15  
3. Razonamiento clínico y análisis del discurso — USD 15  
4. Ética de la intervención y conversación clínica — USD 15  
5. Programa avanzado de lógica, discurso y clínica lacaniana — USD 40  

Puedes entrar por un curso suelto. Completar la colección documenta un recorrido formativo más sólido dentro de MotusDAO — **sin equivaler a Validación ni Portal**.

---

## Tu siguiente paso

Ve a **[03 — Praxis](/academia/03-praxis)** y elige el primer curso o taller que responda a tu necesidad actual.

Si aún te falta cerrar operación en el Hub: perfil → [/perfil](/perfil) · agenda → [/disponibilidad](/disponibilidad) · consultorio → [/videochat](/videochat).`,
        },
      ],
    },
  ],
}

export async function seedAcademyFundamentos(prisma: PrismaClient) {
  const course = await upsertAcademyCourse(prisma, FUNDAMENTOS_COURSE)
  await prisma.course.update({
    where: { id: course.id },
    data: {
      billingInterval: 'monthly',
      updatedAt: new Date(),
    },
  })
  return course
}
