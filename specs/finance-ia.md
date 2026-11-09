# Finance IA — Resumen, rails and doors

> Status: proposal (2026-11-08). This supersedes the flat "Pagos/Actividad/
> Cobros/Métodos" map. Do not implement until the Deposits question below is
> answered.

## 1. Mental model

Three payment rails, each with its own KYC and interface:

| Rail | Money | KYC / account | Surface |
|---|---|---|---|
| **On-chain wallet** | wMXN, USDT, wFIAT | Self-custody (WaaP); Ripio does fiat KYC on the ramp | `/pagos` |
| **Stripe** | Card charges and Stripe payouts | Stripe Connect | `/cobros` (+ `/cobros/depositos` payouts) |
| **SPEI** | Bank transfer / CLABE | Bank; Motus confirms manually | `/finanzas/depositos` (new) |

`Sesiones` is not a rail: it is the operational view of escrow sessions
(`/cobros/sesiones`). `Métodos` is not a rail either: it is the **doors**.

## 2. Routes

| Route | Role |
|---|---|
| `/finanzas` | **Resumen**: money in/out/net, en escrow, unified activity, smart filters, shortcuts |
| `/pagos` | **Wallet**: on-chain self-custody; send/receive/history; Ripio ramp door |
| `/cobros` | **Cobros**: Stripe Connect; charges and embedded panel |
| `/cobros/depositos` | Stripe payouts (keep inside Cobros; not the third rail) |
| `/finanzas/depositos` | **Depósitos SPEI**: CLABE, incoming transfers, manual confirmation |
| `/cobros/sesiones` | **Sesiones**: escrow sessions for the PSM, confirm/release |
| `/finanzas/metodos` | **Métodos**: the doors (Wallet, Ripio, Stripe, SPEI) with status and CTA |

## 3. Resumen: smart filters

The feed can be seen as one list or split by rail. Filters are the mental map:

```
Método:   Todo · Wallet · Stripe · SPEI · Escrow · Academia
Dirección: Todo · Entradas · Salidas
Estado:   Todo · Pendiente · Confirmado · Reembolsado
[Buscar]  [Fecha]
```

- **Wallet** includes on-chain transfers and Ripio on-ramps (the app only sees
  the resulting wMXN/USDT transfer; the Ripio door explains the KYC).
- **Stripe** = card charges (Academy and therapy card).
- **SPEI** = bank transfers/CLABE.
- **Escrow** = therapy sessions in the escrow (deposit, refund, payout).
- **Academia** = course/membership purchases on Stripe.
- `Todo` merges them with rail badges.
- Selecting a rail shows its own summary and a "Abrir [rail]" CTA.

## 4. Resumen layout

1. **Header**: money in / out / net for the filter (per currency; never sum
   USD + MXN + wMXN), and "En escrow" for therapy.
2. **Shortcuts**: Sesiones, Wallet, Cobros, Depósitos, Métodos. Sesiones also
   lives in the sidebar.
3. **Activity** grouped by date, each row with a rail badge (Escrow, Tarjeta,
   SPEI, Academia, Wallet), signed amount, status.
4. **Detail drawer** (phase 2): timeline + tx hash/receipt + link to the rail.

## 5. Sidebar

Under **Finanzas**:

```
Resumen        /finanzas
Wallet         /pagos
Cobros         /cobros
Depósitos      /finanzas/depositos
Sesiones       /cobros/sesiones
Métodos        /finanzas/metodos
```

Remove "Actividad" from the nav; `/finanzas/actividad` can remain as a detail
or redirect to `/finanzas#actividad`. "Pagos" is renamed "Resumen".

## 6. Métodos = doors

Each card shows: rail, what it is, KYC owner, status, and a CTA:

- **Wallet (WaaP)** → `/pagos` (self-custody; wFIAT/USDT).
- **Ripio · MX · wMXN** → `/pagos` (fiat on/off ramp; KYC inside Ripio).
- **Tarjeta (Stripe Connect)** → `/cobros` (KYC inside Stripe).
- **CLABE / SPEI** → `/finanzas/depositos` (bank transfer; manual confirmation).

The Resumen filters point to the same rails; Métodos is the door picker.

## 7. Open question — what is "Depósitos"?

- **A. SPEI deposits** (recommended): new `/finanzas/depositos` for CLABE
  transfers; Stripe payouts stay at `/cobros/depositos`.
- **B. Stripe payouts**: reuse `/cobros/depositos` and add it to the nav; then
  the third rail in the model is Wallet, not SPEI.

The three-rail model (Wallet/Ripio, Stripe, SPEI) implies **A**.

## 8. Phases

| Phase | Scope |
|---|---|
| 1 | Nav + labels; Resumen with summary, filters, Sesiones shortcut; Métodos doors aligned |
| 2 | Rail badges, date groups, detail drawer |
| 3 | SPEI deposits page; saved views/export |

## 9. Acceptance

- A user can explain the map in one sentence: "Resumen shows everything; Wallet,
  Cobros and Depósitos are the three doors; Métodos explains them."
- Every activity row shows its rail.
- Resumen filters by rail and shows the matching summary.
- Sesiones is reachable from Resumen and the sidebar.
- No `/cobros/*` Stripe Site link is moved.
