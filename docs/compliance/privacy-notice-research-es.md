# Investigación: aviso de privacidad (LFPDPPP) — datos sensibles de salud mental

**Proyecto:** MotusDAO Hub  
**Alcance:** orientación para redactar un aviso de privacidad en español conforme a la LFPDPPP, con énfasis en **datos personales sensibles** (salud mental / información psicológica o psiquiátrica).  
**Fecha:** 2026-10-27  
**Nivel de diligencia:** medio (revisión normativa + muestra de mercado; no sustituye asesoría legal mexicana ni estadounidense).

---

## Aviso importante

Este documento es **material de investigación interna** para redacción de políticas. No constituye asesoría legal. Un abogado en materia de protección de datos y, si aplica, regulación sanitaria en México (y privacidad en EE.UU.) debe revisar el aviso final, los flujos de consentimiento y los contratos con encargados.

---

## 1. Marco legal aplicable (México)

| Instrumento | Rol para el aviso |
|-----------|-------------------|
| [LFPDPPP](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf) (texto vigente; reformas publicadas en DOF, p. ej. nov. 2025) | Obligaciones del **responsable**, consentimiento (arts. 7–9), principios de tratamiento (arts. 10–13), **contenido mínimo** del aviso (art. 15), modalidades simplificada/integral (art. 16), seguridad y confidencialidad (arts. 18–20), **derechos ARCO** (arts. 21–34), **transferencias** (arts. 35–36). |
| Reglamento de la LFPDPPP | Detalle operativo (plazos, bloqueo/cancelación, medidas compensatorias cuando no se puede notificar al titular, etc.). |
| [Lineamientos del aviso de privacidad](https://www.dof.gob.mx/nota_detalle.php?codigo=5288372&fecha=17/01/2013) (DOF 17-ene-2013) | Elementos del **aviso integral** que van más allá del mínimo del art. 15 (transferencias, revocación, cookies, finalidades secundarias, etc.). |
| Guías INAI (p. ej. [Manual del aviso de privacidad](https://inicio.inai.org.mx/CalendarioCapacitacion/ManualAvisoPrivacidad.pdf)) | Buenas prácticas de redacción, ejemplos de cláusulas y checklist de cumplimiento. Siguen siendo referencia práctica aunque las atribuciones de supervisión en la LFPDPPP reformada se orienten hacia la Secretaría competente. |

### 1.1 ¿Qué son “datos sensibles” de salud en este contexto?

La LFPDPPP define **datos personales sensibles** como los que afectan la esfera más íntima del titular o cuya utilización indebida pueda generar discriminación o riesgo grave (definición en art. 3, fracción VI). Las guías del INAI y materiales de capacitación incluyen explícitamente categorías de **salud**: estado de salud, historial clínico, enfermedades, información **psicológica y/o psiquiátrica**.

Para MotusDAO Hub, conviene tratar como sensibles (además de identificadores de contacto):

- Contenido de consultas, notas clínicas, diagnósticos o impresiones clínicas.
- Contenido de **Psychat** y bitácora/journal cuando reflejen salud mental.
- Grabaciones o metadatos de **videollamadas** terapéuticas.
- Cuestionarios de bienestar, escalas o historial de citas vinculado a salud mental.

### 1.2 Consentimiento para datos sensibles

| Tema | Requisito (LFPDPPP) |
|------|---------------------|
| Tratamiento de sensibles | **Consentimiento expreso y por escrito** (art. 8): firma autógrafa, firma electrónica u **otro mecanismo de autenticación** acordado. |
| Revocación | Debe describirse en el aviso: mecanismos y procedimientos (art. 7, último párrafo). |
| Excepciones sin consentimiento | Art. 9 (p. ej. relación jurídica, emergencia, orden judicial). Para salud: fracción VI (atención médica bajo secreto profesional cuando el titular no puede consentir) y supuestos de transferencia en art. 36, fracción II. |
| Bases de datos sensibles | Deben justificarse finalidades **legítimas, concretas** y acordes con la actividad (art. 8, segundo párrafo). |
| Tiempo de tratamiento | Esfuerzos razonables para limitar el periodo al **mínimo indispensable** (art. 12). |

**Implicación para producto:** un checkbox genérico de términos puede no bastar para sensibles; se recomienda consentimiento **diferenciado** (p. ej. tratamiento clínico, IA, videollamada, uso de wallet) con registro de versión del aviso y timestamp.

### 1.3 Contenido mínimo legal del aviso (art. 15 LFPDPPP)

El aviso **debe contener al menos**:

1. **Identidad y domicilio del responsable** (razón social, domicilio para oír notificaciones, correo o medio de contacto).
2. **Datos personales tratados**, **identificando los sensibles** (por dato o por categoría; INAI recomienda señalamiento expreso).
3. **Finalidades del tratamiento**, distinguiendo las que **requieren consentimiento** (primarias vs secundarias/accesorias).
4. **Opciones y medios** para que el titular **limite el uso o divulgación** (distinto de ARCO y de revocación).
5. **Mecanismos, medios y procedimiento ARCO** (incl. departamento o persona de datos personales, art. 29).
6. **Procedimiento y medio** para comunicar **cambios** al aviso.

### 1.4 Contenido del aviso integral (Lineamientos + Manual INAI)

En la práctica, el aviso **integral** publicado en el sitio suele incluir también:

| Elemento | Qué debe aclarar |
|----------|------------------|
| Origen de los datos | Directo (formularios, app), automático (logs, cookies), indirecto (referidos, integraciones). |
| Finalidades secundarias | Marketing, analítica, mejora de producto; **mecanismo de negativa** antes del tratamiento (y plazo de 5 días hábiles si el aviso no se entrega de forma personal/directa). |
| **Transferencias** | Si existen; **destinatario o categoría**; **finalidad concrea**; si requieren consentimiento; cláusula de aceptación/rechazo cuando aplique (arts. 35–36). |
| **Transferencias internacionales** | País o región del encargado; salvaguardas (contrato, cláusulas tipo, evaluación de riesgo). |
| Revocación del consentimiento | Medios, requisitos, efectos (p. ej. imposibilidad de seguir prestando el servicio). |
| Cookies / web beacons / tecnologías similares | Finalidades, cómo deshabilitarlas; enlace a política de cookies si es extensa. |
| **Medidas de seguridad** (recomendado) | Nivel alto para salud: cifrado en tránsito, control de acceso, auditoría, confidencialidad del personal (arts. 18–20). |
| **Periodos de conservación** (recomendado fuerte) | Por categoría de dato y finalidad; alineado con art. 10 (supresión tras bloqueo cuando ya no sean necesarios) y normativa sanitaria mexicana si guardan expediente clínico. |
| Menores de edad | Si el servicio puede usarse por menores: consentimiento de padres/tutores según lineamientos. |
| Vulneraciones de seguridad | La ley exige notificación al titular cuando la afectación sea significativa (art. 19); el aviso puede resumir el compromiso. |

### 1.5 Modalidades: simplificado vs integral (art. 16)

- **Recolección electrónica (app/web):** mostrar primero aviso **simplificado** con fracciones I–IV del art. 15 + enlace al aviso **integral**.
- **Impreso o entrega presencial:** aviso completo en el momento de la recolección.

MotusDAO Hub debería implementar: banner o pantalla inicial (simplificado) + ruta permanente `/aviso-de-privacidad` (integral).

### 1.6 Derechos ARCO (resumen operativo)

- Plazos: respuesta en **20 días hábiles**; si procede, hacer efectivo en **15 días hábiles** siguientes (art. 31).
- Solicitud: requisitos del art. 28 (identidad, descripción del derecho, localización de datos).
- **Cancelación:** bloqueo y luego supresión; excepciones art. 25 (incl. expediente/tratamiento de salud por profesional sujeto a secreto).
- Ejercicio **gratuito** (art. 34), con límites en solicitudes repetitivas.

### 1.7 Transferencias y encargados (arts. 35–36)

- Toda **transferencia** a terceros (nacional o internacional) distintos del encargado debe estar **prevista en el aviso**, con cláusula de aceptación cuando el consentimiento sea necesario (art. 35).
- **Sin consentimiento** solo en los supuestos del art. 36 (ley/tratado, asistencia sanitaria, grupo corporativo con mismas políticas, contrato en interés del titular, interés público, proceso judicial, relación jurídica).
- Los **encargados** (proveedores que tratan por cuenta del responsable) deben quedar bajo contrato y listados (subprocesadores), aunque jurídicamente no siempre son “transferencias” al titular si el responsable sigue siendo quien decide.

---

## 2. Prácticas de mercado (estructura paráfrasis — 3 referentes)

Se revisaron avisos públicos de operadores mexicanos con datos sensibles o de salud. **No copiar texto**; usar solo como referencia de estructura y tono.

### 2.1 Doctoralia — Terapia (telepsicología, México)

**Fuente:** [Política de privacidad — Terapia Doctoralia MX](https://terapia.doctoralia.com.mx/politica-de-privacidad)

**Estructura típica:**

- Introducción al servicio (plataforma de conexión con psicólogos; no sustituye emergencias).
- **Responsable(s)** del grupo (entidad mexicana con domicilio en CDMX; posible coexistencia con otras entidades del grupo para fines distintos).
- **Origen de datos:** formularios con **datos de salud** para matching; tecnologías automáticas (cookies) con enlace a política de cookies.
- **Finalidades:** vincular con profesional, gestionar citas, comunicaciones operativas.
- **Rol del profesional:** el psicólogo como responsable independiente de la relación clínica; datos compartidos con el profesional elegido.
- **Base legal / consentimiento:** datos necesarios para el servicio; oposición implica limitación del servicio.
- **Contacto ARCO:** correo dedicado y domicilio.
- **Seguridad (centro de ayuda):** cifrado, controles de acceso, seudonimización; refuerzo para datos de salud; sin decisiones 100% automatizadas con efectos jurídicos en salud.
- **Comunicaciones:** no solicitan datos sensibles por WhatsApp/SMS/correo/llamada.

**Lecciones para Motus:** separar claramente **plataforma** vs **profesional de la salud**; declarar datos de salud en formularios de intake; canal único para ARCO; advertencia sobre canales inseguros.

### 2.2 Nu México (fintech — datos sensibles no clínicos)

**Fuente:** [Aviso de privacidad — clientes y prospectos](https://nu.com.mx/aviso-de-privacidad-clientes-y-prospectos/); [Derechos ARCO](https://nu.com.mx/derechos-arco/)

**Estructura típica:**

- Identificación del responsable y **momentos de recolección** (app, web, promociones).
- **Inventario por categorías** (identificación, biométricos, financieros, ubicación).
- Bloque dedicado a **datos sensibles** (discapacidad, origen étnico, estatus migratorio, etc.) con énfasis en: solo recolección **directa**, **consentimiento expreso**, carácter **voluntario**.
- Finalidades primarias y secundarias; transferencias a filiales y proveedores.
- Procedimiento ARCO detallado (correo, documentos, plazos de 20 días).
- Obligación del titular de informar a terceros cuyos datos proporcione.

**Lecciones para Motus:** tabla o listado por categorías; párrafo explícito de sensibles; procedimiento ARCO paso a paso; tono claro en español mexicano.

### 2.3 TuoTempo / Doctoralia (salud + transferencias internacionales)

**Fuente:** [Política de privacidad — TuoTempo MX](https://www.tuotempo.com.mx/politica-de-privacidad)

**Estructura típica:**

- Responsables **múltiples** (México + entidad en Italia para equipo técnico).
- Datos tratados (contacto, uso, cookies).
- Finalidades (prestación del servicio, estadística, marketing con posibilidad de oposición).
- **Terceros / subprocesadores** por categoría (nube, comunicaciones, pagos, IT).
- Sección explícita: **¿Transferimos datos fuera de México?** — sí, con proveedores en el extranjero y compromiso de cumplir LFPDPPP.
- **Conservación por tipo:** servicios activos + **6 años** tras término de relación; datos de pacientes/citas **6 años** tras cancelación de cuenta; marketing hasta revocación; reclamaciones 6 años.
- Derechos LFPDPPP + contacto al INAI.
- Seguridad y limitación de garantía en transmisión por internet.

**Lecciones para Motus:** plazos de retención **por categoría**; disclosure de transferencia internacional; lista de categorías de proveedores; contacto de privacidad dedicado.

---

## 3. Usuarios en Estados Unidos desde México (alto nivel)

MotusDAO Hub puede atender personas en EE.UU. (p. ej. latina/o en diáspora) **sin** infraestructura HIPAA típica. El aviso y los términos deberían **aclarar expectativas**, sin presentar el servicio como cubierto por HIPAA salvo que exista un programa formal.

| Tema | Qué suele aclararse |
|------|---------------------|
| **HIPAA** | HIPAA regula principalmente **entidades cubiertas** y **socios de negocio** en EE.UU. Un responsable mexicano que presta servicios directamente al consumidor **no es “HIPAA certified”** por defecto. Solo aplicaría un marco tipo BAA si Motus actuara como business associate de un covered entity estadounidense. |
| **No es sustituto de emergencia / no es hospital** | Igual que referentes de teleterapia: no 911, no urgencias psiquiátricas; recursos en EE.UU. (988, 911) si el usuario indica ubicación en EE.UU. |
| **Ley aplicable y jurisdicción** | Definir si el contrato y el aviso se rigen por **leyes de México** (LFPDPPP) y tribunales/ciudad mexicanos, o si se ofrece variante para residentes de ciertos estados de EE.UU. (requiere revisión legal; leyes estatales de privacidad pueden aplicar según alcance comercial). |
| **Transferencia internacional** | Desde la perspectiva mexicana: informar transferencias a EE.UU. (IA, nube, videoconferencia) y base de consentimiento o supuesto del art. 36. Desde EE.UU.: el usuario debe entender que los datos pueden almacenarse o procesarse **fuera de EE.UU.** |
| **Derechos del consumidor** | LFPDPPP (ARCO) para titulares en México; residentes de California, Colorado, etc. pueden tener derechos adicionales si Motus cumple umbrales de leyes estatales — mencionar canal de contacto sin prometer cumplimiento no evaluado. |
| **Pagos y wallet** | Datos financieros/patrimoniales requieren **consentimiento expreso** en México (art. 7); en EE.UU. pueden aplicar reglas de divulgación de proveedores de pago y cripto según el producto. |
| **Profesionales licenciados** | Si los terapeutas están licenciados en México, aclarar que la relación clínica puede no equivaler a licencia en el estado de residencia del usuario en EE.UU. |

**Redacción sugerida (plantilla conceptual, no final):**  
*“Si accede desde Estados Unidos, reconoce que Motus opera principalmente bajo la legislación mexicana de protección de datos personales. El servicio no declara cumplimiento HIPAA ni actúa como entidad cubierta, salvo que se indique lo contrario por escrito en un acuerdo específico. Sus datos pueden procesarse en México y en otros países donde se ubiquen nuestros proveedores de infraestructura, IA o videocomunicación.”*

---

## 4. Checklist temas MotusDAO Hub

Usar al redactar el aviso integral y los consentimientos en producto.

### 4.1 Identidad y roles

- [ ] Razón social, RFC si aplica, domicilio, correo de privacidad / departamento de datos personales.
- [ ] Diferenciar: **Motus (plataforma)** vs **profesional de la salud** (responsable del expediente clínico, si aplica).
- [ ] Encargados vs responsables conjuntos (p. ej. proveedor de IA solo como encargado).

### 4.2 Datos sensibles de salud mental

- [ ] Categorías: estado de salud mental, antecedentes, motivo de consulta, notas de sesión, escalas, **contenido de chat clínico**.
- [ ] Datos **no** sensibles pero relevantes: nombre, correo, teléfono, wallet address (tratar patrimoniales/financieros si hay pagos on-chain o fiat).

### 4.3 Psychat (asistente de IA)

- [ ] Finalidad: apoyo informativo / entre sesiones; **no** es nota clínica ni expediente (alineado con `specs/safety-slice-2-psychat.md`).
- [ ] Proveedor y modelo (p. ej. Venice / DeepSeek): nombre en aviso y en UI.
- [ ] Modos de privacidad:
  - [ ] **TEE / texto en claro** hacia el proveedor: consentimiento expreso aparte (`consentToAIProcessing`).
  - [ ] **Cifrado en navegador (E2EE):** qué ve Motus vs proveedor; límites (metadatos, facturación, logs).
- [ ] Retención: hilo de visita **no almacenado** vs futuras funciones (archivo, exportación) — si se lanzan, **actualizar aviso** antes de activar.
- [ ] No sustituye atención de emergencia; enlaces a recursos MX / US según ubicación declarada.

### 4.4 Videollamadas (Jitsi u otro)

- [ ] Finalidad: sesión terapéutica sincrónica.
- [ ] Quién opera la infraestructura (self-hosted vs Jitsi as a Service); **país** de servidores.
- [ ] Si hay grabación (por defecto **no**); si en el futuro hay grabación con consentimiento, sección dedicada.
- [ ] Metadatos (hora, duración, ID de sala, IP en logs).
- [ ] Obligaciones del usuario (entorno privado, no grabar por su cuenta sin consentimiento del terapeuta).

### 4.5 Wallet / Sign-In with Ethereum (SIWE)

- [ ] Finalidad: autenticación, identidad pseudónima, elegibilidad para funciones Web3.
- [ ] Datos: dirección pública de wallet, nonce, dominio SIWE (`NEXT_PUBLIC_APP_URL`, allowlist).
- [ ] **No** confundir dirección pública con anonimato total (trazabilidad on-chain).
- [ ] Consentimiento expreso si se vincula wallet a expediente clínico o historial sensible.
- [ ] Integraciones: faucet, paymaster, Ripio u otros — listar como encargados y finalidades (fraude, cumplimiento, ejecución de transacción).

### 4.6 Bitácora / journal (presente y futuro cifrado)

- [ ] Estado actual: entradas almacenadas en backend (definir si ya son clínicas/sensibles).
- [ ] Futuro **cifrado en cliente:** quién posee la clave, recuperación ante pérdida, si Motus puede descifrar.
- [ ] Finalidades: autorreflexión vs parte del expediente; acceso del terapeuta si se comparte.
- [ ] Retención y cancelación al eliminar cuenta (ARCO cancelación + bloqueo).

### 4.7 Consentimiento para entrenamiento (futuro)

- [ ] Finalidad secundaria explícita; **opt-in** separado del servicio clínico.
- [ ] Qué datos: ¿texto desidentificado?, ¿embeddings?, ¿solo fuera de expediente?
- [ ] Revocación y efecto en modelos ya entrenados (expectativas realistas).
- [ ] Transferencia a proveedores de ML fuera de México.

### 4.8 Transferencias y subprocesadores (lista inicial)

- [ ] Hosting / base de datos (p. ej. Supabase u otro) — región.
- [ ] Proveedor de IA (Venice).
- [ ] Videoconferencia (Jitsi).
- [ ] Autenticación / correo / analytics (si aplica).
- [ ] Pagos fiat o cripto.
- [ ] Actualizar anexo o página de subprocesadores cuando cambie la cadena de suministro.

### 4.9 Seguridad, incidentes y auditoría

- [ ] Medidas administrativas, técnicas y físicas (art. 18).
- [ ] Sesiones admin, auditoría de accesos (`safety-slice-5` — mencionar compromiso de trazabilidad sin detalle técnico excesivo).
- [ ] Compromiso de notificación ante vulneraciones significativas (art. 19).

### 4.10 Retención sugerida (definir con legal y clínica)

| Tipo de dato | Orientación de mercado / normativa | Acción Motus |
|--------------|-----------------------------------|--------------|
| Expediente / notas clínicas | A menudo varios años (normativa sanitaria y NOM aplicables al expediente) | Definir plazo con asesor y profesional de la salud |
| Citas y metadatos | Referentes: hasta 6 años post-cuenta | Decidir política documentada |
| Psychat (sin archivo) | Mínimo indispensable; logs técnicos acotados | Alinear con ingeniería |
| Wallet / logs de seguridad | Plazo corto o rolling retention | Política de logs |
| Marketing | Hasta revocación | Mecanismo de opt-out |

### 4.11 Cambios al aviso

- [ ] Publicación en sitio con fecha de vigencia.
- [ ] Notificación por correo o banner si el cambio es sustancial (especialmente nuevas finalidades o transferencias).

---

## 5. Checklist de redacción (orden sugerido del documento)

1. [ ] Título: **Aviso de privacidad integral** + fecha de última actualización.
2. [ ] Introducción (quién es Motus, qué servicios, ámbito geográfico).
3. [ ] Definiciones (titular, responsable, encargado, datos sensibles, tratamiento).
4. [ ] Responsable del tratamiento (identidad y contacto).
5. [ ] Datos personales que se recaban (tabla: categoría | ejemplos | sensible sí/no | obligatorio/opcional).
6. [ ] Datos sensibles de salud — sección destacada.
7. [ ] Finalidades primarias (prestación de servicios de salud mental, cuenta, citas, IA, wallet).
8. [ ] Finalidades secundarias (marketing, analítica, mejora, **entrenamiento futuro**) + mecanismo de negativa.
9. [ ] Fundamento del consentimiento (expreso y por escrito para sensibles; expreso para financieros).
10. [ ] Transferencias nacionales e internacionales + tabla de categorías de destinatarios.
11. [ ] Cláusulas de aceptación/rechazo de transferencias que lo requieran.
12. [ ] Encargados y subprocesadores (enlace a anexo).
13. [ ] Plazos de conservación y supresión/bloqueo.
14. [ ] Medidas de seguridad (resumen).
15. [ ] Derechos ARCO + revocación + limitación de uso/divulgación.
16. [ ] Cookies y tecnologías de rastreo (o enlace).
17. [ ] Menores (si aplica).
18. [ ] Usuarios en Estados Unidos / descargo HIPAA y emergencias.
19. [ ] Cambios al aviso.
20. [ ] Versión **simplificada** (arts. 15 I–IV + enlace al integral) para onboarding web/app.

---

## 6. Alineación con producto actual (referencia interna)

| Función | Punto de verdad en repo | Implicación para el aviso |
|---------|-------------------------|---------------------------|
| Psychat + consentimiento IA | `specs/safety-slice-2-psychat.md`, `lib/ai-consent-copy.ts` | Consentimiento separado; disclosure de proveedor/modelo; modos TEE vs E2EE. |
| Journal / bitácora | `app/api/bitacora/route.ts` | Tratamiento de contenido potencialmente sensible; ARCO sobre entradas. |
| SIWE / dominios | `specs/safety-slice-5-admin-session-audit.md` | Mencionar autenticación wallet y dominios permitidos. |
| Journal cifrado / training | Roadmap en specs de safety | Cláusulas “futuras” o publicar aviso actualizado antes del lanzamiento. |

---

## 7. Fuentes y lectura adicional

### Normativa y autoridad (México)

- [LFPDPPP — Cámara de Diputados (PDF)](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf)
- [Lineamientos del aviso de privacidad — DOF 17/01/2013](https://www.dof.gob.mx/nota_detalle.php?codigo=5288372&fecha=17/01/2013)
- [Manual del aviso de privacidad — INAI (PDF)](https://inicio.inai.org.mx/CalendarioCapacitacion/ManualAvisoPrivacidad.pdf)
- [Repositorio de guías — aviso de privacidad (INAI)](https://inicio.inai.org.mx/RepositorioGuias/Sitio%20Aviso%20de%20Privacidad/index.html)
- [Guía para titulares — INAI (PDF)](https://inicio.inai.org.mx/Guias/Guia%20Titulares-01_PDF.pdf)

### Referentes de mercado (estructura)

- [Doctoralia Terapia — política de privacidad](https://terapia.doctoralia.com.mx/politica-de-privacidad)
- [Doctoralia — privacidad y protección de datos (ayuda)](https://help.docplanner.com/101/doc/hc-privacidad-y-proteccion-de-datos)
- [Nu México — aviso de privacidad](https://nu.com.mx/aviso-de-privacidad-clientes-y-prospectos/)
- [Nu México — derechos ARCO](https://nu.com.mx/derechos-arco/)
- [TuoTempo México — política de privacidad](https://www.tuotempo.com.mx/politica-de-privacidad)

### Estados Unidos (contexto, no exhaustivo)

- [HHS — HIPAA para profesionales](https://www.hhs.gov/hipaa/for-professionals/index.html) (entidades cubiertas y business associates)
- [FTC — Health Breach Notification Rule](https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule) (ciertos proveedores de salud digital no cubiertos por HIPAA)

### Salud y expediente (México — revisar con asesor)

- [Ley General de Salud](https://www.diputados.gob.mx/LeyesBiblio/pdf/LGS.pdf) (secreto profesional, expediente)
- Normas oficiales mexicanas aplicables al expediente clínico y conservación (identificar la NOM vigente según tipo de establecimiento y modalidad)

---

## 8. Próximos pasos recomendados

1. Validar con counsel: responsable legal exacto, domicilio, y si Motus genera **expediente clínico** o solo facilita medios.
2. Redactar aviso integral + simplificado en español (variante EN opcional para usuarios en EE.UU.).
3. Mapear **registro de consentimientos** en base de datos (versión de aviso, finalidad, timestamp, mecanismo).
4. Publicar **anexo de subprocesadores** y proceso de actualización.
5. Revisar flujos Psychat, Jitsi y wallet contra el texto final antes de lanzamiento público amplio.

---

*Documento generado para el equipo de producto y cumplimiento de MotusDAO Hub.*
