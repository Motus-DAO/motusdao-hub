# SPEI, pago simbólico y comisiones — Spec

> Status: **DESIGN LOCKED · NOT IMPLEMENTED** · Owner: product + eng
>
> Purpose: que el SPEI deje de ser dinero que Motus no toca. El paciente paga directo al
> profesional, la app registra el aviso y la confirmación, y Motus cobra su **10%** al PSM
> a fin de mes con Stripe. Incluye el **pago simbólico** (precio ≤ 45 USD por sesión) y la
> suspensión por falta de pago.

---

## 1. Decisiones locked

| Tema | Regla |
|---|---|
| Precio base | **45 USD** por sesión (estándar Motus) |
| Pago simbólico | Opcional. El PSM declara si acepta; si sí, **ajusta el precio por sesión** (≤ 45 USD) |
| Comisión | **10% siempre**, sobre el monto cobrado y en la **moneda de cobro** |
| SPEI | Solo **MXN** por ahora |
| Base de comisión | Solo sesiones `psm_confirmed`; nunca `patient_reported` |
| Facturación | **Corte el último día del mes**; vence a los **7 días**; suspensión al día 8 |
| Reactivación | **5% del saldo vencido** (cuota de servicio) + saldo |
| Suspensión | Solo **nuevas citas**; las agendadas se respetan; el PSM siempre puede entrar a pagar |
| Reembolso | **Nota de crédito**; el cargo no se borra |
| UI | “Comisiones” en `/cobros` **solo si el PSM cobra por SPEI/CLABE** |
| Tarjeta | El 10% ya lo cobra Stripe (`application_fee_amount`); **no** entra al ledger de comisiones |
| Celo | El 10% lo hará el escrow; tampoco entra a este ledger |

## 2. Pago simbólico (modelo B: por sesión)

- `PSMProfile.acceptsSymbolic: boolean` — se pregunta en el onboarding, con explicación.
- `PSMProfile.symbolicFloorUsd: number | null` — piso que el PSM declara (≤ 45).
- `Session.listPriceUsd = 45`; `Session.agreedPriceUsd` lo fija el PSM al aceptar la sesión
  (default 45; si acepta simbólico, entre su piso y 45).
- `Session.subsidyGapUsd = listPrice - agreedPrice` — se guarda para el fondo de acceso futuro.
- El paciente ve el monto **final** en la pantalla de pago, no en el perfil.

Flujo:
1. El paciente elige horario y solicita.
2. Si el PSM acepta simbólico y ajusta el precio, el paciente ve el monto ajustado antes de pagar.
3. Si no, el monto es 45 USD.

## 3. Ledger de comisiones

```ts
type CommissionCharge = {
  id: string
  psmId: string
  sessionId: string
  method: 'spei'
  baseAmount: string      // monto cobrado, en la moneda del cobro
  currency: 'MXN'
  rateBps: 1000           // 10%
  amount: string          // base * 10%
  status: 'accrued' | 'invoiced' | 'paid' | 'void'
  accruedAt: Date
  invoicedAt: Date | null
  paidAt: Date | null
  stripeInvoiceId: string | null
}

type CommissionInvoice = {
  id: string
  psmId: string
  periodStart: Date
  periodEnd: Date
  total: string
  currency: 'MXN'
  status: 'open' | 'paid' | 'void'
  dueAt: Date
  stripeInvoiceId: string | null
  reactivationFee: string | null
}
```

Estados: `accrued → invoiced → paid`; `void` solo por nota de crédito (reembolso).
La comisión se genera cuando el PSM confirma la transferencia (`psm_confirmed`).

## 4. Facturación y suspensión

```
Último día del mes   → se cierra el periodo y se genera la factura Stripe
Día 7                → vence
Día 8                → suspensión de nuevas citas
Pago                 → se levanta la suspensión (+ 5% de reactivación si aplica)
```

- El cobro es **con tarjeta** (Stripe Invoice / Checkout) a la cuenta plataforma; no toca la
  cuenta Connect del PSM.
- La suspensión **no cancela** sesiones ya agendadas.
- La cuota de reactivación es 5% del saldo vencido y se suma al siguiente cobro.
- Si el PSM paga, el estado pasa a `paid` y se reagenda el ciclo.

## 5. Canales seguros

- Instrucciones de pago **solo dentro de la app**: CLABE + beneficiario + **referencia única**
  por sesión.
- Contacto enmascarado hasta que la sesión esté confirmada.
- Aviso explícito: “Para tu protección, mantén el pago y la comunicación dentro de Motus.
  Los pagos fuera de la app no tienen soporte, recibo ni antifraude.”
- Ventana de pago: si el paciente no reporta en X horas, la sesión se libera.
- Disputa: si el PSM no confirma, el paciente puede abrirla; Motus media con la evidencia
  (reporte + referencia + confirmación).
- No se puede impedir el pago fuera de la app; se desincentiva y se concentra el soporte
  en el flujo in-app (modelo Uber / Binance P2P).

## 6. Non-goals (slices futuros)

- **Facturar a psicólogos** (CFDI / factura electrónica). El ingreso de Motus debería
  facturarse; por ahora se cobra con recibo Stripe. Es un slice de ops/compliance, no de
  producto, y además un servicio vendible (ayudar al PSM con su facturación).
- **Saldo prepago** del PSM (cargar saldo y descontar por sesión).
- **Fondo de acceso / endowment** que subsidie el `subsidyGap`.
- **Chat con cifrado post-cuántico** (xx network) para canales seguros.
- Comisión de Celo (la maneja el escrow) y de tarjeta (la maneja Stripe).

## 7. Slices de implementación

| # | Slice | Qué |
|---|---|---|
| 1 | Pricing simbólico | `acceptsSymbolic`, `symbolicFloorUsd`, `agreedPriceUsd` por sesión; onboarding y pantalla de pago |
| 2 | Comisión SPEI | `commission_charges` al `psm_confirmed`; estado y reversión |
| 3 | Facturación mensual | cierre de mes, Stripe Invoice, vencimiento y pago |
| 4 | Suspensión / reactivación | bloqueo de nuevas citas, cuota 5%, desbloqueo |
| 5 | Canales seguros | copys, referencia, enmascarado, disputa |

## 8. Rollback

- Diseño, sin código: no hay nada que revertir todavía.
- Cuando se implemente: schema **aditivo**; rollback = `git revert` + `DROP TABLE` de
  `commission_charges` / `commission_invoices`. Los cargos no tocan el dinero de la terapia.

## 9. Abiertos

- **FX:** si el precio base es USD y el cobro es MXN, ¿qué tipo de cambio se congela y dónde
  se registra? Propuesta: rate al momento de la sesión, guardado en `Session.fxRate`.
- **Piso simbólico:** ¿el PSM puede bajar a 0 (gratis) o hay un mínimo (ej. 10 USD)?
- **Cuota de reactivación:** 5% del saldo, ¿con mínimo? Propuesta: mínimo 50 MXN.
- **Factura:** recibo Stripe ahora; CFDI cuando la entidad esté lista y el PSM lo pida.
