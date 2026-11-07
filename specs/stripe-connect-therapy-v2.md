# Stripe Connect terapia — Accounts v2

> Status: **IN FLIGHT** · Slice: noviembre 2026
> Plataforma: `MotusDAO-Connect` · `acct_1TnbVgBffEqB2M2K`
> Cuenta histórica: `acct_1L1Sz5FEF6s8pZGT` (Academia + créditos IA, sin cambios)

## 1. Decisión

La terapia con tarjeta corre sobre **Accounts v2**, no sobre el `type: 'express'` de v1.

| Decisión | Valor |
|---|---|
| Creación de cuentas | `stripe.v2.core.accounts.create` |
| Dashboard del profesional | `none` (no entra a Stripe) |
| Fees de procesamiento | `fees_collector: 'stripe'` (los paga la cuenta conectada) |
| Pérdidas | `losses_collector: 'stripe'` (Stripe las asume) |
| Cargos | Directos sobre la cuenta del profesional |
| Comisión Motus | 10% (`application_fee_amount`) |
| Onboarding | Hosted, vía v2 Account Links |
| Países | **Solo México** (plataforma MX, sin cross-border self-serve) |
| Academia | Se queda en la cuenta vieja; migración parkeada (§7) |

El modelo v1 anterior (`type: 'express'`, `account.updated`) queda **superseded**. La rama
`feat/stripe-connect-therapy` (`30af159`) es histórica; no usar.

## 2. Flujo

1. PSM entra a `/perfil` y ve “Cobros con tarjeta”.
2. `POST /api/stripe/connect`:
   - Si no tiene cuenta: crea una v2 (`dashboard: none`, responsabilidades de Stripe,
     `configuration.merchant.card_payments`).
   - Crea un `account_onboarding` link y redirige a Stripe.
3. El profesional completa identidad, RFC y CLABE en Stripe.
4. Al volver, `GET /api/stripe/connect` relee la cuenta con
   `include: ['configuration.merchant', 'requirements']` y actualiza los flags.
5. Paciente reserva: `POST /api/psm/[slug]/checkout` crea un Checkout Session
   con `{ stripeAccount }` y `application_fee_amount`.
6. `checkout.session.completed` (destino *Connected accounts*, snapshot) confirma la cita.
7. Cancelación ≥48 h: refund con `refund_application_fee: true`.
8. Cambios de requisitos/capabilities (destino *Your account*, thin) actualizan los flags.

## 3. Contrato de datos

| Campo | Origen |
|---|---|
| `psm_profiles.stripeConnectedAccountId` | `account.id` v2 (`acct_...`) |
| `psm_profiles.stripeChargesEnabled` | `configuration.merchant.capabilities.card_payments.status === 'active'` |
| `psm_profiles.stripePayoutsEnabled` | `...stripe_balance.payouts.status === 'active'` |
| `sessions.stripeConnectedAccountId` | Cuenta que cobró la sesión |
| `sessions.paidAt` / `refundedAt` | Confirmación y reembolso |
| `therapy_checkout_holds.amountCents` / `feeCents` | Bruto y comisión Motus (USD cents) |

`mapV2AccountStatus()` en `lib/stripe-connect.ts` es la única traducción de estado;
tiene tests en `lib/stripe-connect.test.ts`.

## 4. Variables de entorno

| Variable | Cuenta | Uso |
|---|---|---|
| `STRIPE_SECRET_KEY` | vieja | Academia, créditos IA, suscripciones |
| `STRIPE_WEBHOOK_SECRET` | vieja | Destino `app.motusdao` |
| `STRIPE_CONNECT_SECRET_KEY` | Connect | Onboarding, checkout, refunds |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Connect | Thin events (cuentas v2) |
| `STRIPE_CONNECT_PAYMENTS_WEBHOOK_SECRET` | Connect | Snapshot (checkout de cuentas conectadas) |
| `STRIPE_CONNECT_FEE_BPS` | — | 1000 = 10% (default) |

En Vercel: Production con llaves live. Preview **sin** llaves de Connect para no
escribir cuentas de test en la base de producción.

## 5. Destinos de webhook

| Destino | Scope | Payload | Eventos | URL |
|---|---|---|---|---|
| `motusdao-connect-account-events` | Your account | Thin | `v2.core.account[requirements].updated`, `v2.core.account[configuration.merchant].capability_status_updated` | `/api/stripe/connect/webhook` |
| `motusdao-connect-payments` | Connected accounts | Snapshot | `checkout.session.completed` | `/api/stripe/webhook` |
| `app.motusdao` (vieja) | Your account | Snapshot | Academia | `/api/stripe/webhook` |

Los eventos v2 de cuentas creadas por la plataforma **no** llegan a *Connected accounts*.
Por eso son dos destinos.

## 6. Slices

| # | Slice | Estado | Criterio de aceptación |
|---|---|---|---|
| S0 | Cuenta plataforma + configuración | **Hecho** | `acct_1TnbVgBffEqB2M2K` activa, direct charges, fees/losses Stripe, dashboard none |
| S1 | Onboarding v2 + estado | **Código listo** | Crear cuenta v2, link hosted, flags desde `configuration.merchant` |
| S2 | Webhooks thin + pagos | **Código listo** | Thin 200/400 por secreto; checkout confirma cita |
| S3 | UX del psicólogo: estado | **Hecho** | Card muestra conectado / verificando / activo / requiere datos; payout status |
| S4 | UX del psicólogo: ingresos | **Hecho** | Bruto, comisión Motus, neto y últimas sesiones cobradas; sin dashboard |
| S5 | Checkout E2E test mode | **Pendiente** | Cuenta test, onboarding completo, pago 4242, cita, refund |
| S6 | Deploy live + primer profesional | **Pendiente** | Destinos live responden; un PSM real cobra 45 USD |
| S7 | Migrar Academia a la cuenta Connect | **Parkeado** | Saldo viejo en cero; keys y webhook movidos; historial exportado |

## 7. Academia: decisión y salida

Se queda en `acct_1L1Sz5FEF6s8pZGT` por ahora. Razones: no mezclar la migración de
Connect con la de Academia, y dejar que las ventas actuales absorban el saldo negativo.
Salida: cuando el saldo llegue a cero y Connect esté estable, apuntar
`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` a la cuenta Connect y crear ahí el destino
de Academia. Ver `docs/runbooks/stripe-accounts.md`.

## 8. Rollout y rollback

- Merge a `main` → deploy con env de Production.
- Hasta que un PSM tenga `stripeChargesEnabled`, la UI no cambia (sigue CLABE).
- Rollback: revertir deploy; schema aditivo. Kill switch:
  `UPDATE psm_profiles SET "stripeChargesEnabled" = false;` y desactivar los destinos.
- `db push` solo desde la rama mergeada; nunca desde `main` sin los modelos.

## 9. Abiertos

- **USD en cuenta MX**: validar el primer cobro test en USD; si Stripe lo rechaza, cobrar MXN.
- **Payouts**: mostrar próximo depósito requiere leer `balance`/`payouts` con `stripeAccount`.
- **Facturación/tax**: dos cuentas Stripe para la misma entidad; conciliación pendiente.
- **Requisitos futuros**: `v2.core.account[future_requirements].updated` opcional.
- **Si el SDK sube a 23**: `parseEventNotification` sigue siendo el parser de thin events.
