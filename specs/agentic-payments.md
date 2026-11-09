# Motty as a payments agent — Spec

> Status: **ACTIVE** — slices 1–2 shipped (2026-11-08) · Owner: product + eng
>
> Purpose: que Motty deje de ser un chat de soporte y se vuelva un agente que **hace**
> cosas por el usuario: encuentra su próxima sesión, cotiza en wMXN, revisa saldo, prepara
> el escrow, abre la rampa de Ripio si falta dinero, sigue el estado y manda el recibo.
>
> El LLM interpreta; las herramientas deterministas ejecutan. **Motty nunca firma ni toca
> la llave del agente.**

---

## 1. Flujo objetivo

```
Usuario: "Págale a mi terapeuta la sesión de mañana"
Motty:   getMyUpcomingSession → PSM, 45 USD, mañana 10:00
         quoteTherapyInWmxn → 45 USD ≈ 850 wMXN
         getMyWalletBalance → 50 wMXN
         → "Te faltan 800 wMXN. ¿Te abro Ripio para comprarlos
            y preparo el escrow?"
Usuario: "sí"
Motty:   createTherapyEscrowForMySession → escrow + /pagar/[id]
         getMyRipioRampLink → URL de compra
         → "Compra 800 wMXN aquí; cuando lleguen, paga en este link."
Usuario: deposita y firma
Sesión:  el PSM confirma (settle)
Worker:  libera 90/10
Motty:   getMyPaymentStatus → "Listo: 765 wMXN a Ana, 85 a MotusDAO. Recibo: …"
```

## 2. Herramientas

Todas reciben el `MottySession` server-side (`userId`); **ninguna acepta userId,
direcciones ni montos desde el modelo** más allá de lo que el servidor ya conoce.

| Tool | Entrada | Salida | Efecto |
|---|---|---|---|
| `getMyUpcomingSession` | — | `{ sessionId, psmName, startsAt, priceUsd, currency }` | lectura |
| `quoteTherapyInWmxn` | `{ usd? }` | `{ usd, mxn, rate, source }` | lectura |
| `getMyWalletBalance` | — | `{ wmxn, celo, address }` | lectura (RPC) |
| `createTherapyEscrowForMySession` | `{ sessionId }` | `{ escrowId, payUrl, amountWmxn, startsAt }` | crea la sesión del escrow con `operator` (agente), **sin fondos del usuario** |
| `getMyRipioRampLink` | `{ amountWmxn? }` | `{ url }` | lectura (arma la URL pública) |
| `getMyPaymentStatus` | `{ sessionId }` | `{ status, settledAt, txHash? }` | lectura del escrow |

### Reglas de implementación

- `escrowId = keccak256(toHex("therapy:" + sessionId))`: determinista e idempotente. Si la
  sesión ya existe en el contrato, la tool la devuelve en vez de crear otra.
- `payee` = `Session.psm.eoaAddress`; `patient` = `user.eoaAddress`. El modelo no los elige.
- El monto sale de `PLATFORM_SESSION_PRICE_USD` (45) × `MOTUS_MXN_PER_USD` (env, default
  18.5) mientras no haya oráculo de FX. La fuente del rate se devuelve en la tool para que
  el agente la mencione.
- `createTherapyEscrowForMySession` solo acepta sesiones del propio `userId` y en estado
  `requested`/`accepted`; si no, error tipado.
- El depósito lo firma el usuario en `/pagar/[id]`; el `settle` lo firma el PSM. El agente
  no puede depositar por nadie.
- Rate limit y auditoría: cada tool de escritura registra `userId`, `sessionId`, `escrowId`
  y `txHash` en el log del servidor (y en `PaymentLog` cuando se conecte el ledger).

## 3. Prompt y UX

- `mottySystemPrompt` gana una sección de pagos: qué puede hacer, qué **no** (no firma, no
  mueve dinero, no promete montos sin cotizar), y cuándo pedir confirmación.
- Respuestas con **acciones**: el widget de Motty debe poder renderizar un botón/link
  (`/pagar/[id]`, URL de Ripio) en vez de solo texto. Mínimo: links en markdown.
- Entradas al flujo:
  1. Chat de Motty: “págale a mi terapeuta”.
  2. Tarjeta de la sesión/booking: botón “Pagar con el agente”.
  3. `/finanzas` y `/pagar/[id]` como fallback sin chat.

## 4. Dónde paga el usuario (orden de claridad)

| Superficie | Qué muestra | Estado |
|---|---|---|
| Motty | intención → cotización → link de pago/rampa → recibo | **nuevo** |
| `/pagar/[id]` | monto, estado, depositar/confirmar | ya existe |
| `/finanzas` | hub: wallet, actividad, cobros, métodos | ya existe |
| Booking (`TherapistBookingCard`) | botón “Pagar con wFIAT” | pendiente |

## 5. Dónde ve y hace todo el PSM

Hoy está repartido: `/cobros` (Stripe), `/perfil` (SPEI), `/mis-usuarios` (sesiones).
Propuesta:

- `/pagos/sesiones` (nuevo): próximas sesiones con método y estado de pago, botón
  **Confirmar SPEI**, botón **Confirmar sesión** (escrow settle), monto neto y link al
  recibo. `/cobros` sigue igual (Stripe site links intactos).
- El PSM también puede preguntarle a Motty: “¿qué sesiones tengo pendientes de cobro?”.
  Tools de lectura para PSM en una segunda fase.

## 6. Guardrails

- Motty no tiene `AGENT_PRIVATE_KEY`; las tools que escriben llaman al servidor.
- `payee` y `treasury` fijos; el agente no puede redirigir fondos.
- Una sola sesión de escrow por sesión de terapia (id determinista).
- Monto desde la cotización del servidor, no desde el prompt.
- Feature flag `MOTTY_PAYMENTS_ENABLED` para apagar las tools sin revertir código.
- Si el usuario no tiene sesión o no está autenticado, las tools devuelven error tipado y
  Motty responde con el siguiente paso (login/booking).

## 7. Slices

| # | Slice | Criterio |
|---|---|---|
| 1 | Tools de lectura (`getMyUpcomingSession`, `quote`, `balance`, `status`) + prompt | Motty responde con la sesión y el monto reales |
| 2 | `createTherapyEscrowForMySession` + `getMyRipioRampLink` | crea el escrow una vez y devuelve el link |
| 3 | UX del widget (links/botones) | el usuario llega a `/pagar` desde el chat |
| 4 | `/pagos/sesiones` + settle | el PSM confirma y cobra sin salir del panel |
| 5 | E2E demo + recibo | chat → depósito → settle → release → recibo |

## 8. Non-goals

- Yield / idle money del escrow (roadmap; riesgo de custodia).
- Comisiones SPEI y pago simbólico (spec aparte, `spei-commissions.md`).
- Integrar tarjeta dentro del chat.
- Que Motty firme o custodie.

## 9. Rollback

- `MOTTY_PAYMENTS_ENABLED=false` apaga las tools; el chat sigue como soporte.
- `git revert` de los commits del slice; sin schema nuevo.
- El escrow y el worker no dependen de Motty.

## 10. Abiertos

- Fuente de FX: env fija ahora; Mento/Chainlink después.
- ¿Motty del PSM (settle, cobros) o solo del paciente en v1?
- ¿El link de Ripio con monto prellenado o el usuario lo escribe?
- ¿Recibo en PDF/CFDI? Fuera de alcance; link a Celoscan por ahora.

## 11. Estado (2026-11-08)

**Implementado**
- Tools de lectura: `getMyUpcomingSession`, `quoteTherapyInWmxn`, `getMyWalletBalance`,
  `getMyPaymentStatus`.
- `createTherapyEscrowForMySession` con id determinista e idempotente, y
  `getMyRipioRampLink`.
- `MOTTY_PAYMENTS_ENABLED` (default true), prompt de pagos y `maxToolRounds=6`.
- `lib/escrow/create.ts` reutilizable por el CLI y el worker.
- 4 tests: cotización, fallback de rate, id determinista y flag.

**Falta**
- UX del widget: `MottyMarkdown` ya renderiza links; falta el botón/acción.
- `/pagos/sesiones` para el PSM (core, no “si sobra”).
- Botón de booking → escrow.
- Video + submission.
