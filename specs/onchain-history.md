# Historial de transacciones (`/pagos/historial`) — Spec

> Status: **IN FLIGHT** · Owner: eng · Slice: capa 1 (lectura on-chain)
>
> Purpose: que el usuario vea sus **enviados y recibidos** con monto, hash y la prueba
> (Celoscan), sin depender de una tabla local ni de un indexer propio.

---

## 1. Scope (what this slice delivers)

- `GET /api/onchain/history?address=0x…`: lista normalizada, atada a la sesión SIWE.
- `lib/onchain/history.ts`: normalizador puro de Blockscout (`tokentx` + `txlist`) y fetch.
- `/pagos/historial`: tabs Todo / Enviados / Recibidos, filas con monto, contraparte, fecha,
  estado, hash copiable y link a Celoscan.
- Botón **Historial** en la tarjeta "Saldos de tu Wallet" de `/pagos`.
- Tests del normalizador (11 casos, incluido fetch simulado).

## 2. Non-goals (explicitly out of scope)

- **Persistencia en la DB** (`OnchainTransaction`): es la capa 2; la UI no cambia cuando llegue.
- Filtros por token, rango de fechas o export CSV.
- Indexer propio o webhooks de cadena.
- Mostrar tokens desconocidos: los airdrops de spam quedan fuera.
- Historial de fiat (Stripe/SPEI); solo movimientos on-chain.

## 3. Context / anchors

- [`lib/onchain/history.ts`](../lib/onchain/history.ts) — normalizador + fetch
- [`app/api/onchain/history/route.ts`](../app/api/onchain/history/route.ts) — contrato HTTP
- [`app/pagos/historial/page.tsx`](../app/pagos/historial/page.tsx) — pantalla
- [`lib/platform-spend-guard.ts`](../lib/platform-spend-guard.ts) — la address debe ser la de la sesión
- Blockscout Celo: `https://celo.blockscout.com/api` (`module=account`, `action=tokentx|txlist`)

## 4. Acceptance criteria (Given / When / Then)

1. **Given** sesión SIWE y wallet conectada, **when** el usuario abre `/pagos/historial`,
   **then** ve sus movimientos con monto, símbolo, fecha, estado, hash y link a Celoscan.
2. **Given** un depósito de Ripio (`wMXN`), **when** se lista, **then** aparece como **recibido**
   con el monto y su hash.
3. **Given** un swap (dos transferencias en una tx), **then** se muestran las dos filas.
4. **Given** un token desconocido, **then** no aparece.
5. **Given** una `address` que no es la de la sesión, **then** `403`.
6. **Given** Blockscout caído, **then** error legible y la página no se rompe.

## 5. API contract

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/onchain/history?address=0x…` | Sesión SIWE + address propia | `{ items: OnchainHistoryItem[], cached: boolean }` |

`OnchainHistoryItem`: `txHash`, `direction` (`sent`/`received`), `symbol`, `amount`, `rawAmount`,
`decimals`, `from`, `to`, `timestamp` (ms), `status` (`confirmed`/`failed`), `tokenAddress`,
`explorerUrl`.

## 6. Env vars

| Var | Where | Purpose |
|-----|-------|---------|
| `CELO_BLOCKSCOUT_URL` | server | Override del endpoint (default `https://celo.blockscout.com/api`) |

## 7. Evidence

| Date | Check | Result |
|------|-------|--------|
| 2026-11-07 | `fetchBlockscoutHistory` sobre `0xd0563b…8ba3b` | 41 movimientos; incluye el depósito de **10 wMXN** y el envío de **1 wMXN** |
| 2026-11-07 | `lib/onchain/history.test.ts` | 11 tests verdes |

## 8. QA gate (Definition of Done for this slice)

- [x] `npm run lint` / `npx tsc --noEmit`.
- [x] `npm test` (normalizador y fetch simulado).
- [x] `npm run build`.
- [ ] Verificación en prod con la wallet real.

## 9. Rollback

- `git revert` de los commits de la capa 1. No hay schema ni datos: la ruta y la página
  desaparecen y `/pagos` sigue igual.
- Si Blockscout falla en producción, la API devuelve `502` y el resto de la app no se afecta.

## 10. Decisions — LOCKED

1. **Capa 1 lee Blockscout**; la capa 2 (`OnchainTransaction`) se conecta detrás del mismo
   contrato y la UI no cambia.
2. Solo tokens de `CELO_STABLE_TOKENS`; el spam no se muestra.
3. CELO nativo solo cuando `value > 0` (evita duplicar llamadas ERC-20 del `txlist`).
4. Clave visual `txHash:token`: un swap muestra sus dos piernas.
5. La dirección se valida contra la sesión SIWE, no contra el cliente.
