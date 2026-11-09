# Finance activity UX — research + proposal

> Status: proposal (2026-11-08) · Surface: `/finanzas/actividad`
>
> Problem: the feed mixes escrow, card, SPEI, Academy and raw wallet movements in
> one flat list. The tabs exist, but every row looks the same and there is no
> summary, grouping or per-rail identity. It does not feel like one coherent
> money surface.

## 1. What other products do

| Product | What stands out |
|---|---|
| [Mercury](https://support.mercury.com/hc/en-us/articles/38790547830036-Viewing-cashflow-and-transactions-data-on-your-Transactions-page) | Cashflow graph + Top Money Movements above the table; quick filters (date/amount/keyword), advanced filters (method, category, account); **grouping with collapsible headers and money-in/out totals**; saved views |
| [Monarch](https://www.monarch.com/blog/quicker-and-easier-transaction-review-and-more) | Debit/credit filters; **account and category shown in the list**; summary panel; review actions at the top; more detail without opening each row |
| [Copilot](https://help.copilot.money/en/articles/11780342-copilot-money-for-web) | Multiple filters (account, category, date, recurring, review, tag, type); **Total spent / income / net for the filtered set**; bulk actions; review indicator |
| [Stripe reports](https://support.stripe.com/questions/stripe-reports) | Balance summary, filters, exports; the payment object keeps its own status and reference |
| [DeBank](https://bitpush.news/zh/articles/4839177) | On-chain history has an **analysis mode**: summary of key movements + transaction filters, instead of a raw tx dump |

### Patterns worth copying

1. **Summary before list.** Money in, money out, net — for the current filter.
2. **Two-axis filtering.** Type (therapy/academy/wallet) and direction/status/method.
3. **Group by date with subtotals.** Today / yesterday / this week / month, with in/out totals per group.
4. **Rail identity on every row.** Icon + badge + account/method, so escrow never looks like a card charge.
5. **Signed amounts in the original currency.** Do not sum USD + MXN + wMXN into one fake number.
6. **Detail drawer, not a new page.** Amount, fee, net, status timeline and proof (tx hash/receipt) in place.
7. **Empty states with a CTA** per filter, not a generic "no data".
8. **Saved views/export** for power users (post-hack).

## 2. Motus design

### Header

- **Entradas / Salidas / Neto** for the selected filter and currency.
- Therapy sub-summary: **En escrow / Liquidado / Reembolsado** in wMXN.
- Never sum across currencies; show one currency at a time (wMXN, USD, MXN).

### Filters

```
Tipo:      Todo · Terapia · Academia · Wallet
Método:    (solo Terapia) Todo · Escrow · Tarjeta · SPEI
Dirección: Todo · Entradas · Salidas
[Buscar]   [Fecha]
```

- The method chips are the missing piece: today "Terapia" mixes escrow, card and SPEI.
- Each chip shows a count; filters combine.
- Mobile: chips scroll horizontally; summary 2×2.

### Rows

- **Rail badge** on the leading icon:
  - Escrow: diamond/hexagon, mauve.
  - Tarjeta: credit card, blue.
  - SPEI: bank, green.
  - Academia: graduation cap, amber.
  - Wallet: wallet, slate.
- Title: "Sesión pagada en escrow" / "Sesión pagada con tarjeta" / "Sesión pagada por SPEI" / "Compra en Academia" / "Enviaste wMXN".
- Subtitle: counterparty + method + reference (session id short, last 4 of tx/receipt).
- Amount: signed, original currency; status pill; chevron.
- Group headers: date + in/out subtotal.

### Detail drawer

- **Escrow:** timeline Depositada → Confirmada → Liquidada; 10 wMXN, 9/1 split; start; tx hashes; "Ver en Celoscan"; link to `/pagar/<id>`; actions Confirmar/Liberar.
- **Card:** Stripe reference, receipt, refund state.
- **SPEI:** reference, PSM confirmation.
- **Academy:** order/course, receipt.
- Every row shows its **source of truth**: On-chain / Stripe / SPEI.

### States

- Empty per filter: "No hay movimientos de escrow todavía" + CTA "Pagar una sesión".
- Loading: skeleton rows, not a spinner.
- Error: retry, and show partial data from the other sources.

## 3. Mapping to the current read model

`ActivityKind` already separates the rails:

| Kind | Rail | Badge |
|---|---|---|
| `therapy_escrow` | escrow | Escrow |
| `therapy_card` | Stripe | Tarjeta |
| `therapy_spei` | SPEI | SPEI |
| `academy` | Stripe | Academia |
| `onchain_sent/received` | wallet | Wallet |

No schema change needed for phase 1. The API already returns `items` + `sources`.

## 4. Phases

| Phase | Scope | Time |
|---|---|---|
| 1 | Summary cards, rail badges, method chips, date groups + subtotals, empty states | 1–1.5 h |
| 2 | Detail drawer with timeline + tx/receipt, search | 1–2 h |
| 3 | Saved views, CSV export, notifications | post-hack |

## 5. Acceptance

- Every row shows its rail unambiguously.
- The Terapia tab can be filtered by Escrow / Tarjeta / SPEI.
- Summary totals respect the active filter and currency.
- Date groups show in/out subtotals.
- Empty states are specific and actionable.
- Mobile layout keeps the filters reachable and the amounts readable.

## 6. Non-goals

- New ledger or reconciliation writes.
- Push/email notifications.
- Cross-currency conversion totals (an approximate USD line can come later).
