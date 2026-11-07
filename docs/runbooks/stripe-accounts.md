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
