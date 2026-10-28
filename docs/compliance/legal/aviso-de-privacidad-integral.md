# Aviso de privacidad integral — MotusDAO Hub

Este aviso describe cómo **MotusDAO** (el “Responsable”) trata los datos personales de quienes usan la plataforma **MotusDAO Hub** (el “Servicio”), incluidos pacientes, profesionales de la salud mental y visitantes.

**Ámbito:** personas en México y, si acceden desde el extranjero (incluido Estados Unidos), bajo las reglas descritas en la sección 12.  
**Versión:** 2026-10-27 (`consentPolicyVersion` en registro).

---

## 1. Responsable y contacto

- **Responsable:** MotusDAO  
- **Correo para privacidad y derechos ARCO:** contact@motusdao.org  
- **Sitio:** el dominio publicado en `NEXT_PUBLIC_APP_URL` (p. ej. hub de MotusDAO).

Si incorporamos persona moral o domicilio fiscal distinto, publicaremos la actualización en este aviso.

---

## 2. Datos que recabamos

| Categoría | Ejemplos | ¿Sensible? | ¿Obligatorio? |
|-----------|----------|------------|---------------|
| Identificación y contacto | Nombre, correo, teléfono, ciudad, fecha de nacimiento | No | Según flujo (registro) |
| Salud mental / clínica | Motivo de consulta, intake, notas de bitácora, contenido de Psychat | **Sí** | Según servicio |
| Cuenta y wallet | Dirección de wallet (EOA), identificadores de proveedor de wallet | No (pseudónimo público on-chain) | Para funciones Web3 |
| Videollamada | Audio y video en sesión, nombre mostrado en sala | **Sí** (contenido de sesión) | Si usas video terapia |
| Pagos | Referencias Stripe, rampas cripto, CLABE/SPEI del profesional (cuando aplica) | Financieros / identificación | Si pagas o cobras |
| Archivos | Avatar, cédula profesional, PDFs de academia | Puede incluir sensibles | Opcional |
| Técnicos | IP, cookies, logs de seguridad, eventos de producto (p. ej. PostHog) | No | Automático |

**Psychat** y el chat de intake con IA **no son expediente clínico ni nota de evolución**; son apoyo conversacional con límites descritos en el producto.

---

## 3. Finalidades del tratamiento

### 3.1 Primarias (prestación del Servicio)

- Crear y administrar tu cuenta (incluida autenticación con wallet / SIWE).
- Onboarding, matching con profesionales, agenda y sesiones de videoterapia.
- Operar **Psychat** y formularios de intake asistidos por IA, con el consentimiento específico de procesamiento por IA cuando aplique.
- Bitácora personal (diario): cifrado en el navegador antes de almacenarse; MotusDAO no puede leer el contenido (solo metadatos como fecha). **No** es el expediente clínico del profesional ni del paciente.
- Academia, pagos de cursos y créditos de IA.
- Seguridad, prevención de fraude y auditoría de accesos a datos clínicos en el Hub.

### 3.2 Secundarias

- Analítica de producto (p. ej. páginas visitadas, clics en CTA) si habilitamos PostHog.
- Comunicaciones operativas sobre tu cuenta.

### 3.3 Lo que **no** hacemos hoy

- **No** vendemos tu historial clínico.
- **No** usamos tus conversaciones de Psychat para entrenar modelos de terceros sin un **consentimiento aparte** (función no activa en esta versión).
- **No** presentamos el Servicio como “certificado HIPAA” ni como hospital o consultorio regulado en EE. UU.

---

## 4. Datos sensibles y consentimiento

Los datos de **salud mental** son **personales sensibles** bajo la LFPDPPP (México). Los tratamos cuando:

- Aceptas este aviso y los **términos de uso** en el registro (versión registrada en base de datos).
- Otorgas consentimientos específicos en el flujo (p. ej. compartir perfil con profesional, matching clínico, **procesamiento por IA**).
- Es necesario para la relación de prestación del Servicio que solicitas.

El consentimiento para IA es **independiente** y puedes rechazarlo; algunas funciones dejarán de estar disponibles sin ese consentimiento.

---

## 5. Encargados y transferencias

Compartimos datos con proveedores que nos ayudan a operar el Servicio. Lista detallada: [Subprocesadores](/subprocesadores).

Categorías habituales:

- **Infraestructura:** alojamiento (p. ej. Vercel) y base de datos / archivos (p. ej. Supabase), con servidores que pueden estar **fuera de México** (incluido Estados Unidos).
- **IA:** OpenAI y/o Venice.ai según configuración — el texto del mensaje se procesa en su infraestructura (modo estándar o cifrado según Psychat).
- **Video:** servidores Jitsi operados por MotusDAO (`jitsi.motusdao.org`, `meet.motusdao.org`).
- **Wallet:** Human.tech (WaaP) u otros proveedores si eliges Privy.
- **Pagos:** Stripe, Ripio, Transak u otros según la pantalla de pagos.
- **Analítica:** PostHog (si está configurado).
- **NFT de perfil (opcional):** Lighthouse → IPFS/Filecoin y registro en blockchain Celo (ver sección 8).

Al usar el Servicio desde México hacia encargados en el extranjero, aceptas que esas transferencias son **necesarias** para la prestación del Servicio, salvo que la ley exija un mecanismo adicional.

---

## 6. Plazos de conservación

| Tipo | Plazo orientativo |
|------|-------------------|
| Cuenta e intake | Mientras mantengas cuenta activa; después, bloqueo o supresión según solicitud ARCO y obligaciones legales |
| Bitácora | Mientras mantengas la cuenta; contenido cifrado en servidor (solo tu wallet lo abre); metadatos de entrada conservados |
| Psychat (visita) | No guardamos el hilo completo en base de datos por defecto en la sesión actual |
| Logs de seguridad y auditoría clínica | Plazo acotado necesario para seguridad e investigación de incidentes (orden de meses, salvo obligación legal mayor) |
| Pagos y facturación | Lo que exijan obligaciones fiscales y contables |
| NFT / IPFS | **Público e irreversible** una vez publicado (ver sección 8) |

---

## 7. Derechos ARCO y revocación

Puedes solicitar **Acceso, Rectificación, Cancelación u Oposición**, así como revocar consentimientos no esenciales, escribiendo a **contact@motusdao.org** con:

- Nombre y correo de la cuenta  
- Descripción del derecho que ejerces  
- Copia de identificación razonable para verificar titularidad  

Responderemos en los plazos de la LFPDPPP. La cancelación puede implicar dejar de usar el Servicio. Algunos datos en blockchain o IPFS **no pueden eliminarse por completo**.

---

## 8. Blockchain, wallet y NFT de perfil

- La dirección de wallet es **pública** en redes blockchain.
- Si completas el flujo de **NFT de perfil clínico Motus**, publicamos en IPFS (vía Lighthouse) un JSON con **rol, wallet y fecha de registro**, sin datos clínicos del intake, y registramos la URI en **Celo**. Esa información puede ser **pública y permanente**.
- Avatares y documentos clínicos subidos al Hub se almacenan en **almacenamiento privado** (p. ej. Supabase), no en IPFS, salvo el NFT descrito.

---

## 9. Seguridad

Aplicamos medidas técnicas y organizativas razonables: HTTPS, cookies de sesión httpOnly, controles de acceso por rol, auditoría de accesos clínicos, y restricción de rutas sensibles. Ningún sistema es 100 % seguro; notificaremos incidentes relevantes conforme a la ley aplicable.

---

## 10. Menores

El Servicio está dirigido a **mayores de 18 años**. No recabamos datos de menores de forma intencional.

---

## 11. Cookies y tecnologías similares

Usamos cookies esenciales de sesión y, si está configurado, analítica. Detalle en [Política de cookies](/cookies).

---

## 12. Usuarios en Estados Unidos y otros países

Podemos atender a personas en **Estados Unidos** (incluida la comunidad latina) desde una operación con responsable en México.

- **No** somos un “covered entity” HIPAA salvo acuerdo escrito específico con un profesional de la salud en EE. UU.
- Los datos pueden procesarse en **Estados Unidos** por nuestros encargados (p. ej. nube, IA).
- En **emergencia médica o riesgo inminente**, contacta servicios de emergencia locales; el Servicio **no** sustituye atención de crisis 24/7.

---

## 13. Cambios a este aviso

Publicaremos la fecha de vigencia al inicio. Si el cambio afecta finalidades sensibles o transferencias, te lo notificaremos por correo o aviso destacado en el Servicio cuando sea razonable.

---

## 14. Aviso simplificado (resumen LFPDPPP art. 15)

- **Responsable:** MotusDAO — contact@motusdao.org  
- **Finalidades:** cuenta, salud mental digital, IA opcional, video, pagos, seguridad.  
- **Datos sensibles:** salud mental; consentimiento expreso en el flujo.  
- **Derechos ARCO:** contact@motusdao.org  
- **Aviso integral:** esta página (`/privacy`).
