# Ripio public ramp on `/pagos` — Spec

> Status: **IN FLIGHT** · Owner: eng · Slice: cierre del flujo Ripio (hackathon)
>
> Purpose: que `/pagos` abra la rampa **real** de Ripio sin llaves partner y que la app
> compruebe on-chain que el wFIAT llegó a la wallet del usuario.

---

## 1. Scope (what this slice delivers)

- `lib/ripio/public-ramp.ts`: builder de `ramp.ripio.com` con `country`, `chain=42220`,
  `token` y `address`, más validación de wallet y monto.
- `/pagos`: cuando `/api/ripio/widget-token` responde `mock` (sin credenciales B2B) y no se
  fuerza el wizard, se abre la rampa pública con la wallet y el token del país.
- Verificación de depósito: saldo antes de abrir, comparación al volver, delta y link a Celoscan.
- El wizard mock queda detrás de `NEXT_PUBLIC_RIPIO_MOCK_PANEL=true`; nunca es el default.

## 2. Non-goals (explicitly out of scope)

- API B2B de off-ramp con sesión reusable (requiere KYB en `platform.ripio.com`).
- Monto fijo desde la app: el usuario lo elige dentro de Ripio.
- Automatizar el off-ramp o el payout al banco.
- Cambiar Stripe o el flujo de terapia.

## 3. Context / anchors

- [`lib/ripio/public-ramp.ts`](../lib/ripio/public-ramp.ts)
- [`app/pagos/page.tsx`](../app/pagos/page.tsx) — `handleStartRipioRamp`, `handleCheckRipioDeposit`
- [`lib/balances.ts`](../lib/balances.ts) — lectura de saldo wFIAT
- Redes verificadas: `GET https://ramp.ripio.com/api/countries/MX/networks` devuelve Celo
  (`chainId 42220`) con `wMXN`; `AR` devuelve Celo con `wARS`.
- `address` identifica la wallet del usuario en ambos flujos; en off-ramp **no** fija la cuenta
  bancaria (se elige dentro de Ripio y queda reusable).

## 4. Acceptance criteria (Given / When / Then)

1. **Given** wallet conectada y sin credenciales B2B, **when** el usuario compra, **then** se abre
   `ramp.ripio.com` con `country=MX`, `chain=42220`, `token=WMXN` y `address=<wallet>`.
2. **Given** el flujo de retiro, **then** se abre `/offramp` con los mismos parámetros.
3. **Given** el usuario vuelve de Ripio, **when** pulsa "Verificar depósito", **then** ve el delta
   real, el saldo antes/después y el link a Celoscan.
4. **Given** `NEXT_PUBLIC_RIPIO_MOCK_PANEL=true`, **then** se abre el wizard demo (solo demo).
5. **Negative path:** **given** una wallet o un monto inválidos, **when** se construye la URL,
   **then** se lanza un error claro y no se abre nada.
6. **Mobile:** **given** un navegador móvil sin sesión SIWE, **when** el usuario pulsa Comprar,
   **then** la pestaña abre igual: la URL se construye y `window.open` ocurre dentro del gesto,
   sin llamar a la ruta B2B.

## 5. Data / schema changes

- None.

## 6. Env vars

| Var | Where | Purpose |
|-----|-------|---------|
| `NEXT_PUBLIC_RIPIO_COUNTRY` | client | `MX` (default, `wMXN`) o `AR` (`wARS`) |
| `NEXT_PUBLIC_RIPIO_MOCK_PANEL` | client | `true` abre el wizard demo; omitido = rampa pública |
| `NEXT_PUBLIC_RIPIO_WIDGET_ENABLED` | client | `true` usa el widget B2B (requiere credenciales + sesión SIWE); default = rampa pública |
| `NEXT_PUBLIC_RIPIO_RAMPS_ENABLED` | client | `false` oculta el proveedor |
| `RIPIO_CLIENT_ID` / `RIPIO_CLIENT_SECRET` | server | Solo para el widget B2B |

## 7. QA gate (Definition of Done for this slice)

- [x] `lib/ripio/public-ramp.test.ts` (URL, país/token, monto, address).
- [x] `npm run lint` / `npx tsc --noEmit` / `npm test`.
- [x] `npm run build`.
- [x] Prueba manual en prod: comprar **50 wMXN** desde `/pagos` en iPhone (fix `afdfc20`).
- [ ] Payout del off-ramp confirmado (Ripio está validando la cuenta).

### 7.1 Evidence

| Date | Check | Result |
|------|-------|--------|
| 2026-11-07 | Compra de **50 wMXN** por el botón en iPhone | ✅ tx `0xf02132ff9a51…b379e2` |
| 2026-11-07 | Off-ramp de 59 MXN: Ripio envió un **micro-depósito de 0.01 MXN** a la CLABE | ⏳ validación bancaria; payout en revisión |

Ripio valida la CLABE destino con un micro-depósito y la cuenta debe pasar a `enabled` antes
de que salga el payout. El micro-depósito **no** es el retiro.

## 8. Exit conditions

Loop ends when AC pass, QA gate green, and the prod deposit check shows a positive delta.

## 9. Rollback

- `NEXT_PUBLIC_RIPIO_MOCK_PANEL=true` devuelve el wizard demo sin tocar código.
- `git revert` en orden inverso: docs → pagos → builder.

## 10. Decisions — LOCKED

1. Rampa pública primero; el widget B2B solo cuando existan credenciales.
2. `chain` va **numérico** (`42220`), que es como lo compara la app de Ripio.
3. `address` = wallet del usuario, nunca la cuenta bancaria.
4. El mock es opt-in explícito; un botón real no debe abrir un wizard falso.
5. La rampa pública se abre **sincrónicamente** y sin sesión: el widget B2B, que sí necesita
   ambas, queda detrás de `NEXT_PUBLIC_RIPIO_WIDGET_ENABLED`.
