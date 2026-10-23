# Pagos de terapia: CLABE en main, Stripe Connect en rama

> Status: **CLABE en `main`**. **Connect estacionado.** · Slice: octubre 2026
>
> La sesión se puede pagar por SPEI directo al profesional. La tarjeta con comisión de Motus queda escrita, pero no se mezcla a `main` hasta que exista una cuenta de Stripe que sí pueda ser plataforma.
>
> El próximo agente empieza por este archivo. El código de Connect no está en GitHub: vive en la rama local `feat/stripe-connect-therapy` (`30af159`). No la fusiones. No la borres.

---

## 1. Qué quedó en `main`

Commit `3e6a1d4` — *Show a psychologist's SPEI account only to the patient with an active appointment.*

- El profesional guarda titular, banco y CLABE en `/perfil`, en la tarjeta "Pago de la sesión por SPEI". No está en el registro.
- La CLABE no sale en el perfil público de `/psicoterapia`.
- El paciente la ve en su propio perfil solo si tiene una cita `requested` o `accepted` con ese profesional. El vínculo solo, sin cita, no la muestra.
- El paciente registra monto en MXN y clave de rastreo. El profesional confirma "Sí, ya la recibí" o "No me llegó".
- Cada aviso es una fila en `session_transfer_events`. Motus no recibe ese dinero.
- Migración `prisma/migrations/20261023163000_spei_transfer_events`. Ya está aplicada en la base que usa la app. Las columnas son aditivas. El sitio publicado no las lee hasta que se despliegue `3e6a1d4`.

Rollback de la CLABE, solo si se decide quitarla:

```sql
ALTER TABLE "psm_profiles"
  DROP COLUMN IF EXISTS "speiBeneficiaryName",
  DROP COLUMN IF EXISTS "speiBankName",
  DROP COLUMN IF EXISTS "speiClabe";
DROP TABLE IF EXISTS "session_transfer_events";
```

## 2. Qué quedó fuera de `main`

Rama local `feat/stripe-connect-therapy`, commit `30af159`.

No está en GitHub. No se fusionó. El punto de partida es `27ac4c7`, anterior a la CLABE. Por eso `app/perfil/page.tsx`, `prisma/schema.prisma` y `package.json` van a chocar al rebasar sobre `main`.

La cuenta actual `acct_1L1Sz5FEF6s8pZGT` no se puede convertir en plataforma de Connect. Stripe pide una cuenta nueva, con el mismo login. Esa cuenta nueva pide RFC a nombre de quien sea la cuenta. Sin RFC activo no se creó.

Academia y los créditos de IA siguen cobrando en la cuenta vieja. El checkout de Academia no se reescribió.

## 3. Cómo está armado Connect en esa rama

Cargo directo sobre la cuenta Express del profesional. Motus se queda un application fee del 10% (`STRIPE_CONNECT_FEE_BPS`, default 1000, tope 5000). La comisión de la tarjeta la cobra Stripe del lado del profesional.

- Precio de la sesión: 45 USD.
- El horario se aparta al pagar. Cancelar con 48 horas o más devuelve el pago y el fee. Dentro de esas 48 horas la cita se cancela y el profesional conserva el pago.
- Solo un profesional con `stripeChargesEnabled` pasa por "Pagar y reservar". Los demás siguen en "Agendar sesión".
- País del perfil mapeado a ISO: México, Colombia, Argentina, Chile, Perú, Venezuela, Ecuador, Bolivia, Paraguay, Uruguay, España. `otros` no puede conectar.
- El webhook de Academia no se reemplaza. La rama acepta un segundo secreto, `STRIPE_CONNECT_WEBHOOK_SECRET`, en la misma URL `/api/stripe/webhook`.

Archivos de la rama:

- `app/api/stripe/connect/route.ts`
- `app/api/stripe/therapy/confirm/route.ts`
- `app/api/psm/[slug]/checkout/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/psm/[slug]/book/route.ts`
- `app/api/sessions/[sessionId]/route.ts`
- `components/payments/StripeConnectCard.tsx`
- `components/psicoterapia/TherapistBookingCard.tsx`
- `lib/stripe-connect.ts`, `lib/stripe-therapy.ts`, `lib/stripe-connect.test.ts`
- `prisma/migrations/20261023120000_stripe_connect_therapy`

Esa migración también está aplicada en la base. El código de producción no selecciona esas columnas hasta que la rama se despliegue. No las borres al rebasar.

## 4. Cuando el RFC y la cuenta nueva existan

1. En el login de Stripe, crea la cuenta nueva. No borres la vieja. El saldo negativo y el cargo de Custom Domain se quedan en la cuenta vieja.
2. En el cuestionario de la cuenta nueva: cargos directos, dashboard Express, la comisión de la tarjeta la paga el profesional, Motus solo el application fee.
3. Completa el perfil de plataforma en `/connect` de esa cuenta.
4. Crea el destino `app.motusdao-connect`: Events from **Connected accounts**, Snapshot, API `2020-08-27`, URL `https://app.motusdao.org/api/stripe/webhook`, eventos `checkout.session.completed` y `account.updated`. El destino `app.motusdao` se deja como está.
5. El `whsec` nuevo va en `STRIPE_CONNECT_WEBHOOK_SECRET`. `STRIPE_WEBHOOK_SECRET` sigue siendo el de Academia.
6. Separa las llaves antes de fusionar. La rama todavía usa una sola `STRIPE_SECRET_KEY`. Academia debe seguir con la llave de `acct_1L1Sz5FEF6s8pZGT`. Connect tiene que usar la llave de la cuenta nueva. Si no se separan, la terapia intentaría cobrar en la cuenta que no puede ser plataforma.
7. Rebasa `feat/stripe-connect-therapy` sobre `main` actual. Conserva la CLABE y los campos de Stripe. No hagas merge ciego.
8. Recién ahí se fusiona y se despliega. Hasta que un profesional termine la verificación, `stripeChargesEnabled` sigue en falso y la agenda no cambia.

No actives Global Payouts, Thin events ni Allow small charges. No crees otro destino "Your account". Financial Connections no es Connect y en México no está disponible.

## 5. Fuera de este slice

- El contrato de escrow no se construye.
- No se cambia el honorario del profesional para hacer un descuento cripto.
- No se recortan las monedas de `/pagos`.
- SPEI no pasa por Stripe.
