# Finance hub (`/finanzas`) — Spec

> Status: **ACTIVE** · Owner: product + eng · Slice: IA + read model
>
> Purpose: un solo lugar para pagos. El usuario entra a **Finanzas** y desde ahí llega a su
> wallet, sus cobros (PSM), su actividad y sus métodos, sin saltar entre cuatro superficies
> con chromes distintos.
>
> **Restricción dura:** no se mueven las rutas `/cobros/*`. Stripe tiene los seis Site links
> configurados a `https://app.motusdao.org/cobros/...`; cambiarlas rompe AccountSessions y
> AccountLinks live. La reorganización es de **menú y de hub**, no de URLs.

---

## 1. Scope (este slice)

- Menú agrupado por dominio: **Práctica / Finanzas / Aprender / Cuenta**, role-aware.
- `/finanzas`: hub con tarjetas a Wallet (`/pagos`), Cobros (`/cobros`, solo PSM),
  Actividad (`/finanzas/actividad`) y Métodos (`/finanzas/metodos`).
- `/finanzas/metodos`: wallet WaaP, rampa Ripio (país/token), CLABE/SPEI y Stripe del PSM.
- `GET /api/finance/activity` + `/finanzas/actividad`: feed **de solo lectura** que mezcla
  movimientos on-chain, pagos de terapia (tarjeta/SPEI) y compras de Academia.
- Sin schema, sin writes nuevos, sin mover rutas.

## 2. Non-goals (explicitly out of scope)

- Mover `/cobros/*` o reconfigurar Stripe site links.
- Persistir `payment_intents` (fase 3).
- Mover `/pagos` a `/finanzas/wallet` (fase 4, con redirects).
- Escribir en Stripe/SPEI; este slice solo lee.
- Unificar comisiones, impuestos o conciliación contable.

## 3. Mapa actual (por qué se siente fragmentado)

| Flujo | Página | API | Storage | Lib |
|---|---|---|---|---|
| Tarjeta terapia | `/psicoterapia`, `/cobros` | `/api/psm/[slug]/checkout`, `/api/stripe/connect/*` | `Session.stripe*`, `TherapyCheckoutHold`, `PSMProfile.stripe*` | `lib/stripe-connect.ts` |
| SPEI / CLABE | `/perfil`, `/psicoterapia` | `/api/spei`, `/api/spei/sessions/[id]` | `PSMProfile.spei*`, `SessionTransferEvent` | `lib/spei.ts` |
| P2P cripto | `/pagos` | ninguna (WaaP firma) | nada (Blockscout) | `lib/payments.ts` |
| Rampa Ripio | `/pagos` | `/api/ripio/widget-token` | nada | `lib/ripio/*` |
| Historial on-chain | `/pagos/historial` | `/api/onchain/history` | Blockscout | `lib/onchain/history.ts` |
| Academia | `/academia` | `/api/stripe/*` | `Order`, `Payment` | `lib/stripe.ts` |

Cada riel escribe en un lugar distinto y **no hay una lectura única**. `PaymentLog` existe pero
nadie la escribe; el escrow agregará un quinto riel.

## 4. IA propuesta

```
Inicio

Práctica
  Psychat
  Psicoterapia        (usuario) / Mis usuarios (PSM)
  Disponibilidad      (PSM)
  Supervisión         (PSM)
  Bitácora
  Videochat

Finanzas
  Pagos               → /finanzas        (hub)
  Actividad           → /finanzas/actividad
  Cobros              → /cobros          (PSM)
  Métodos             → /finanzas/metodos

Aprender
  Academia

Cuenta
  Perfil
```

El hub `/finanzas` muestra el saldo/estado y cuatro tarjetas; cada una enlaza a la superficie
existente. Nada de lo que ya funciona se mueve.

## 5. API contract

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/api/finance/activity` | Sesión SIWE | `{ items: ActivityItem[], sources: { onchain: number, therapy: number, academy: number } }` |

```ts
type ActivityItem = {
  id: string
  kind: 'onchain_sent' | 'onchain_received' | 'therapy_card' | 'therapy_spei' | 'academy'
  title: string
  subtitle: string
  amount: string | null   // formateado; null cuando no hay monto fiable
  currency: string | null
  timestamp: number       // ms
  status: 'confirmed' | 'pending' | 'failed' | 'refunded'
  href: string | null     // página interna relacionada
  explorerUrl: string | null
}
```

Reglas de mezcla:

- On-chain: sale de `fetchBlockscoutHistory(eoa)` (ya probado).
- Terapia tarjeta: `Session.paidAt != null`; monto desde `TherapyCheckoutHold.amountCents`
  (USD cents) si existe; si no, monto `null` y título “Sesión pagada”.
- Terapia SPEI: `SessionTransferEvent.kind = 'psm_confirmed'`; monto y moneda del evento.
- Academia: `Payment` completado; monto/moneda y `orderId`.
- Orden: `timestamp` desc; tope 50.
- Dedup: una sesión con tarjeta y SPEI no se duplica (preferencia tarjeta).

## 6. Fases

| Fase | Qué | Estado |
|---|---|---|
| 1 | Menú agrupado + `/finanzas` + `/finanzas/metodos` | **este slice** |
| 2 | `/api/finance/activity` + `/finanzas/actividad` (lectura) | **este slice** |
| 3 | `payment_intents` persistido; cada riel escribe una fila; el escrow escribe `settlement`/`fee` | diferido (requiere `db push` y writes) |
| 4 | Mover `/pagos` → `/finanzas/wallet` con redirects | diferido |
| 5 | Retirar `PaymentLog` y handlers legacy | diferido |

La fase 3 es la que convierte el feed en ledger propio. Se difiere a propósito: toca schema y
los writes de Stripe/SPEI, justo después de dejar la rampa Ripio funcionando.

## 7. QA gate

- [x] Tests del mapper de actividad (7 casos: fuentes, orden, dedup, límite).
- [x] `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] Manual en prod: menú por rol, hub, métodos y actividad con datos reales.
- [ ] `/cobros/*` sigue respondiendo igual (no se tocó ninguna URL).

## 8. Rollback

- **Punto de restauración:** tag `finance-hub-baseline-2026-11-07` (commit `3a97692`), el estado
  con Ripio E2E funcionando.
- Volver: `git checkout finance-hub-baseline-2026-11-07` o `git revert` de los commits del slice.
- Sin schema y sin writes: revertir no borra datos ni deja tablas huérfanas.

## 9. Decisions — LOCKED

1. **Nunca** se mueven las rutas `/cobros/*`.
2. El hub enlaza, no reescribe: la reorganización es de navegación.
3. La actividad es **read model** ahora; la persistencia (`payment_intents`) es fase 3.
4. El ledger futuro es donde el worker del escrow escribirá `settlement` y `fee`.
