# Psychat — memoria de contexto (RootRouter / enclaves)

> Chat-data **slice 5** · Plan: [SDD-chat-data.md](../../docs/specs/SDD-chat-data.md) §6–7  
> Arquitectura: [psychat-rootrouter-context.md](../architecture/psychat-rootrouter-context.md)

Guía para personas que usan Psychat. La configuración rápida está en **Psychat → botón «Memoria: …»** (modal).

---

## Qué es esto (en una frase)

Elige **dónde vive el contexto largo** que el asistente usa para responder. Es **distinto** de:

- **Privacidad Venice** (TEE/E2EE) — cómo viaja **cada mensaje** al modelo.
- **Copia cifrada Psychat** — respaldo en tu cuenta Motus (wallet).
- **Bitácora** — diario con otra llave.
- **Resumen al profesional / entrenamiento** — otras salidas con otro consentimiento.

---

## Modos disponibles

| Modo | Qué promete | Estado en Hub |
|------|-------------|---------------|
| **Estándar (Hub)** | El hilo va en el navegador; inferencia vía Motus (`/api/chat`). RAG Motus opcional. | ✅ Default |
| **Memoria local (RootRouter)** | `store.json` en **tu PC**; Psychat habla con `http://127.0.0.1:8787`. Motus no indexa ese archivo. | ✅ Fase 1 |
| **Sala de sesión (enclave)** | Proxy efímero con attestation del build RootRouter. | 🔶 Beta (requiere env ops) |
| **Enclave 24/7** | Proxy siempre encendido en enclave. | ⏳ Próximamente |

---

## Fase 1 — RootRouter en tu computadora

### 1. Instalar y arrancar RootRouter proxy

En la máquina donde usas Psychat (mismo navegador):

```bash
# Ejemplo — ajusta a tu instalación RootRouter / @rootrouter/proxy
npx @rootrouter/proxy --port 8787
```

Debe escuchar en `http://127.0.0.1:8787` (o la URL que pongas en el modal).

### 2. Clave upstream hacia Motus (crédito + consentimiento)

1. Entra a Psychat con wallet y **consentimiento de IA** activo.
2. Abre **Memoria: …** → elige **Memoria local (RootRouter)**.
3. Pulsa **Generar clave upstream** y copia el bloque.
4. Pégalo en la config de RootRouter como **OpenAI-compatible upstream**:
   - `base_url`: URL del Hub + `/api/chat/rootrouter-upstream`
   - `api_key`: token JWT (vence en ~**15 minutos**; regenera cuando falle)

Motus cobra **crédito de IA** en ese upstream; RootRouter guarda el contexto en **`store.json`** en claro **en tu disco**.

### 3. Activar en Psychat

- Marca la casilla de entendimiento (`store.json` local en claro para el proxy).
- **Probar conexión** en el modal.
- Guarda. El pie del chat mostrará **Memoria: Memoria local (RootRouter)**.

### 4. Enviar mensajes

- Usa **Privacidad estándar (TEE)** — E2EE y memoria RootRouter **no** se combinan en esta versión.
- Si falla: ¿proxy encendido? ¿upstream token vigente? ¿CORS desde el navegador al localhost?

---

## Fase 2 — Enclave de sesión (ops)

Variables de entorno (deploy):

- `NEXT_PUBLIC_PSYCHAT_SESSION_ENCLAVE_URL` — URL del proxy en enclave.
- `PSYCHAT_ENCLAVE_ATTESTATION_MOCK_OK=true` — solo dev/staging para probar gate.
- Producción: attestation real contra build publicado RootRouter (`GET /api/psychat/enclave-attestation?url=…`).

---

## Fase 3 — Always-on

`NEXT_PUBLIC_PSYCHAT_ALWAYS_ON_ENCLAVE=true` cuando exista oferta comercial.

---

## APIs (referencia)

| Ruta | Uso |
|------|-----|
| `GET /api/psychat/context-capabilities` | Flags de entorno |
| `POST /api/psychat/proxy-bridge` | Token upstream 15 min |
| `POST /api/chat/rootrouter-upstream` | Inferencia OpenAI-compatible sin RAG |
| `GET /api/psychat/enclave-attestation` | Gate fase 2 |

---

## Lo que Motus no hace (SDD)

- No indexa bitácora ni archivo Psychat cifrado en RootRouter.
- No sustituye export wallet ni resumen consentido.
- No promete “nadie ve nada” — el slice que sale al modelo sigue siendo plaintext en ese request; Venice TEE/E2EE es otra capa.

---

## Referentes externos

SMOS, Organism, Mem0 (proxy + memoria local), Phala/NEAR/TrustedRouter (TEE inferencia/enclave). Motus integra **Psychat + crédito Hub + wallet slices 1–4**.
