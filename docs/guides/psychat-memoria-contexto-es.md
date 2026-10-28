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

### Resumen (2 terminales)

| Terminal | Qué |
|----------|-----|
| **1 — Hub** | `npm run dev` (o usa tu URL de Vercel) |
| **2 — Proxy** | Script del modal **Memoria** o abajo |

Psychat → `http://127.0.0.1:8787/v1/chat/completions` → RootRouter (`store.json` local) → Hub `/v1/chat/completions` (crédito + Venice).

### 1. Arrancar el proxy (npm, sin clonar)

Desde el modal **Memoria** en `/psychat` copia el bloque, o:

```bash
export ROOTROUTER_UPSTREAM_ORIGIN="http://localhost:3000"   # o https://tu-hub.vercel.app
export ROOTROUTER_STORE_PATH="$HOME/.rootrouter/psychat-store.json"
export ROOTROUTER_HOST=127.0.0.1
export PORT=8787
npx -p @rootrouter/proxy@beta rootrouter-proxy
```

En el repo **motusdao-hub**:

```bash
HUB_ORIGIN=http://localhost:3000 ./scripts/psychat-rootrouter-proxy.example.sh
```

Comprueba: `curl -s http://127.0.0.1:8787/healthz`

### 2. Desde clone RootRouter (tu máquina de dev)

```bash
cd /path/to/RootRouter   # monorepo MotusDAO
npm install
npm run proxy:build
ROOTROUTER_UPSTREAM_ORIGIN=http://localhost:3000 npm run proxy:start
```

Docs upstream: [packages/proxy/README.md](https://github.com/RootRouter/RootRouter/blob/main/packages/proxy/README.md)

### 3. Cursor / store del proyecto (opcional)

```bash
npx rootrouter@beta init cursor --project-store --project-agent-id motusdao-hub
```

Eso indexa el repo en `~/.rootrouter/` para Cursor; **Psychat** usa el proxy + `psychat-store.json` aparte.

### 4. Activar en Psychat

1. `/psychat` → consentimiento IA.
2. **Memoria** → **Memoria local (RootRouter)** → **Probar conexión** → casilla → **Guardar**.
3. Privacidad **estándar (TEE)** (no E2EE + RootRouter a la vez).
4. Escribe: el Hub pone el token de puente en cada envío (~15 min).

No hace falta pegar API keys en RootRouter: el proxy **reenvía** el header `Authorization` al Hub.

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
| `POST /api/chat/rootrouter-upstream` | Misma lógica (alias legacy) |
| `POST /v1/chat/completions` | Ruta OpenAI-compatible para el proxy |
| `GET /api/psychat/enclave-attestation` | Gate fase 2 |

---

## Lo que Motus no hace (SDD)

- No indexa bitácora ni archivo Psychat cifrado en RootRouter.
- No sustituye export wallet ni resumen consentido.
- No promete “nadie ve nada” — el slice que sale al modelo sigue siendo plaintext en ese request; Venice TEE/E2EE es otra capa.

---

## Referentes externos

SMOS, Organism, Mem0 (proxy + memoria local), Phala/NEAR/TrustedRouter (TEE inferencia/enclave). Motus integra **Psychat + crédito Hub + wallet slices 1–4**.
