# Finance IA — Resumen as the map

> Status: proposal (2026-11-08). Supersedes the flat "Pagos/Actividad/Cobros/
> Métodos" map and the idea of a separate Métodos page.

## 1. One sentence

**Resumen shows all the money and the three methods; each method opens its own
interface to act.**

## 2. The three methods

| Method | Money | KYC / account | Interface |
|---|---|---|---|
| **Wallet + Ripio** | wMXN, USDT, wFIAT | Self-custody (WaaP); Ripio does fiat KYC on the ramp | `/pagos` |
| **Stripe** | Card charges and payouts | Stripe Connect | `/cobros` |
| **SPEI** | CLABE / bank transfer | Bank; Motus confirms manually | `/finanzas/depositos` (new) |

`Sesiones` is not a method: it is the operational view of escrow sessions
(`/pagos/sesiones`). It has a shortcut in Resumen and in the sidebar.

## 3. Resumen = "Métodos" + summary + activity

`/finanzas` is the map:

1. **Métodos (selector).** Four tiles: **Todo · Wallet · Stripe · SPEI**.
   - Each tile shows the method name, its KYC owner, a mini summary and an
     **Abrir** link to its interface.
   - Clicking the tile **filters the page** (summary + activity); it does not
     navigate. "Abrir" is the explicit link to the method page.
   - This is the mental map: three methods, one place to see them together or
     split.
2. **Summary for the selected method.**
   - Todo: money in / out / net, en escrow, per currency.
   - Wallet: wMXN + USDT + CELO, Ripio ramp status.
   - Stripe: charged, pending, payouts.
   - SPEI: deposits, pending confirmations.
3. **Activity** filtered by the selected method, with rail badges, direction
   and status filters, date groups and a detail drawer.
4. **Shortcuts:** Sesiones (and the method pages).

No separate `/finanzas/metodos` page. That route redirects to `/finanzas`; the
Métodos cards are the first block of Resumen.

## 4. Sidebar

```
Finanzas
  Resumen       /finanzas
  Wallet        /pagos
  Cobros        /cobros
  Depósitos     /finanzas/depositos
  Sesiones      /pagos/sesiones
```

- "Pagos" becomes "Resumen".
- "Actividad" disappears from the nav; `/finanzas/actividad` can stay as a
  detail view or redirect to `/finanzas#actividad`.
- "Métodos" disappears from the nav; it lives inside Resumen.
- Stripe payouts remain at `/cobros/depositos`, inside Cobros.

## 5. What each method page does

- **Wallet `/pagos`:** on-chain self-custody; send/receive/history; Ripio buy/sell
  door. This is where wFIAT/USDT live.
- **Cobros `/cobros`:** Stripe Connect; charges and embedded panel; payouts under
  `/cobros/depositos`.
- **Depósitos `/finanzas/depositos`:** CLABE/SPEI; incoming transfers and manual
  confirmation.
- **Sesiones `/pagos/sesiones`:** escrow sessions; confirm/release; shortcut in
  Resumen.

## 6. Filters are the methods

The primary filter is the method tile. Secondary filters refine within it:

```
Método:   Todo · Wallet · Stripe · SPEI
Categoría: Todo · Terapia · Academia
Dirección: Todo · Entradas · Salidas
Estado:   Todo · Pendiente · Confirmado · Reembolsado
[Buscar]  [Fecha]
```

- Wallet includes on-chain transfers and the resulting Ripio on-ramps; the app
  cannot always know the fiat source, so the Ripio tile explains the KYC.
- Stripe includes card charges (therapy and Academy).
- SPEI includes bank transfers.
- Escrow is the therapy flow inside Wallet (wMXN); Sesiones is its operational
  view.

## 7. Open question — what is "Depósitos"?

The three-method model implies **SPEI**:

- **A (assumed):** `/finanzas/depositos` for CLABE/SPEI; Stripe payouts stay at
  `/cobros/depositos`.
- **B:** "Depósitos" means Stripe payouts; then reuse `/cobros/depositos` and
  the third method would be Wallet instead of SPEI.

Implement A unless confirmed otherwise.

## 8. Phases

| Phase | Scope |
|---|---|
| 1 | Nav + labels; Resumen with the 3 method tiles, per-method summary, activity filter, Sesiones shortcut; `/finanzas/metodos` redirect |
| 2 | Rail badges, date groups, detail drawer |
| 3 | SPEI deposits page; saved views/export |

## 9. Acceptance

- A user can say: "Resumen shows everything; the three methods are there; I
  open one to act."
- Clicking a method tile filters the summary and activity; "Abrir" goes to its
  page.
- Sesiones is reachable from Resumen and the sidebar.
- No `/cobros/*` Stripe Site link is moved.
