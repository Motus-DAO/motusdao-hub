# Stripe accounts registry

Una cuenta Stripe por propósito. No crear cuentas para probar: usar sandboxes.

| Propósito | Nombre | `acct_` | País | Llave en env | Webhooks | Notas |
|---|---|---|---|---|---|---|
| Academia + créditos IA | `MotusDAO — Academia (prod)` | `acct_1L1Sz5FEF6s8pZGT` | MX | `STRIPE_SECRET_KEY` | `app.motusdao` (snapshot) | Conserva historial y saldo negativo; no cerrar hasta saldo 0 |
| Plataforma Connect | `MotusDAO — Connect (prod)` | `acct_1TnbVgBffEqB2M2K` | MX | `STRIPE_CONNECT_SECRET_KEY` | `motusdao-connect-account-events` (thin) y `motusdao-connect-payments` (snapshot) | v2, dashboard none, fees/losses Stripe |
| Desarrollo | `MotusDAO sandbox` | — | MX | test keys | destinos de test | Borrar los sandboxes extra |

## Reglas

1. Una cuenta live por propósito, con nombre que lo diga.
2. Un alta abandonada se cierra el mismo día.
3. Nunca borrar una cuenta con balance, cobros, disputas o historial fiscal.
4. Antes de cerrar: exportar invoices/payouts, revocar API keys, desactivar webhooks.
5. No compartir llaves entre cuentas. `STRIPE_SECRET_KEY` es Academia;
   `STRIPE_CONNECT_SECRET_KEY` es Connect.
6. No mover Academia a Connect hasta que el saldo de la vieja esté en cero.

## Mapa de secretos

| Variable | Destino | Scope | Payload |
|---|---|---|---|
| `STRIPE_WEBHOOK_SECRET` | `app.motusdao` (cuenta vieja) | Your account | Snapshot |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | `motusdao-connect-account-events` | Your account | Thin |
| `STRIPE_CONNECT_PAYMENTS_WEBHOOK_SECRET` | `motusdao-connect-payments` | Connected accounts | Snapshot |

Cada destino genera su propio `whsec`; no son intercambiables.

## Dashboard embebido (componentes de Connect)

La cuenta Connect tiene `dashboard: 'none'`: los profesionales no entran a Stripe. El panel
vive en el Hub (`/cobros`) y usa **Connect embedded components** con un `AccountSession`
creado en `POST /api/stripe/connect/account-session`.

`NEXT_PUBLIC_STRIPE_CONNECT_PUBLISHABLE_KEY` debe ser la publishable key de
`acct_1TnbVgBffEqB2M2K`, la **misma cuenta** que `STRIPE_CONNECT_SECRET_KEY`. La publishable
key de Academia (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) no sirve para este panel.

### Site links

Stripe no permite crear AccountSessions en modo live hasta que cada componente tenga su URL.
Configurar en **Dashboard → Settings → Connect → Site links** (cuenta Connect), marcando
**Yes** en cada componente:

| Componente | URL | Ruta en el repo |
|---|---|---|
| Notification banner | `https://app.motusdao.org/cobros` | `app/cobros/page.tsx` |
| Account management | `https://app.motusdao.org/cobros/cuenta` | `app/cobros/cuenta/page.tsx` |
| Payouts | `https://app.motusdao.org/cobros/depositos` | `app/cobros/depositos/page.tsx` |
| Payments | `https://app.motusdao.org/cobros/pagos` | `app/cobros/pagos/page.tsx` |
| Balances | `https://app.motusdao.org/cobros/saldos` | `app/cobros/saldos/page.tsx` |
| Documents | `https://app.motusdao.org/cobros/documentos` | `app/cobros/documentos/page.tsx` |

Los mismos valores están en `CONNECT_SITE_LINKS` (`lib/stripe-connect-paths.ts`). Stripe
agrega `?stripe_account_id=acct_...` a esos enlaces; la app valida que la cuenta pertenezca al
PSM con sesión antes de crear el AccountSession y muestra un gate de wallet/SIWE si hace falta.

### Onboarding y requisitos

- Onboarding inicial: hosted (Account Links `account_onboarding`), vuelve a `/cobros`.
- Cuenta que ya cobra: **no** se pueden crear links `account_update` con `dashboard: 'none'` y
  Stripe responsable de pérdidas. Los requisitos y la cuenta bancaria se actualizan en
  `/cobros/cuenta` (Account management) y el aviso aparece en `/cobros` (Notification banner).
