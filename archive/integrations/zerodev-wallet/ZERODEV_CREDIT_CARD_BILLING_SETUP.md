# Configuración: ZeroDev Credit Card Billing (Facturación con Tarjeta)

## Situación Actual

✅ **Tu dev ya configuró ZeroDev para usar credit card billing:**
- ZeroDev fronts gas for users
- Charges your dev's debit/credit card
- Esto es el modo **credit card billing**, NO self-funded

❌ **Problema:**
- El código está intentando usar `selfFunded=true` 
- El proyecto en el dashboard solo muestra Alfajores (testnet)
- No aparece opción para Celo Mainnet en el dashboard

## Solución: Usar Credit Card Billing (NO Self-Funded)

### Paso 1: Cambiar Variable de Entorno

**En tu `.env.local` o archivo de variables de entorno:**

```bash
# Cambia esto:
NEXT_PUBLIC_ZERODEV_SELF_FUNDED=true

# A esto:
NEXT_PUBLIC_ZERODEV_SELF_FUNDED=false
```

O simplemente **elimina la línea** si no la necesitas.

### Paso 2: Verificar que Funciona

1. Reinicia tu servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Abre la consola del navegador (F12)
3. Busca logs que digan `[ZERODEV] ⚙️ Configuration:`
4. Debe mostrar:
   - `mode: 'credit-card-billing'` (NO 'self-funded')
   - `useSelfFunded: false`

### Paso 3: Usar tus $10 en Gas Credits

**Para usar tus gas credits con credit card billing:**

1. Ve al dashboard de ZeroDev
2. Ve a "Gas Policies" (aunque solo muestre Alfajores)
3. Crea una "Project Policy" para Alfajores
4. **IMPORTANTE:** Los gas credits se usarán automáticamente cuando hagas transacciones
5. Una vez que se agoten los créditos, ZeroDev cobrará a la tarjeta

**Nota:** Aunque el dashboard solo muestre Alfajores, el código puede usar mainnet especificando el chainId en la URL (que ya está hecho).

## ¿Por Qué Solo Muestra Alfajores en el Dashboard?

El proyecto fue creado en Alfajores (testnet) en el dashboard. Esto es normal y **NO es un problema** porque:

1. ✅ El mismo Project ID funciona en mainnet
2. ✅ El código especifica `chainId=42220` en las URLs
3. ✅ ZeroDev API acepta transacciones en mainnet aunque el dashboard muestre testnet

## Verificación

### En el Código

El código ya está configurado para usar mainnet:
- `FORCED_CHAIN = celoMainnet` (Chain ID: 42220)
- URLs incluyen `chainId=42220`
- Bundler URL: `.../chain/42220`

### En el Dashboard

Aunque el dashboard muestre Alfajores:
- ✅ Las transacciones funcionarán en mainnet
- ✅ Los gas credits se usarán automáticamente
- ✅ Después de agotar créditos, se cobrará a la tarjeta

## Configurar Límite de Tarjeta

**IMPORTANTE:** El límite NO se configura en ZeroDev, se configura en tu banco:

1. **App de tu banco:**
   - Busca "Límites de gasto" o "Spending limits"
   - Establece un límite mensual (ej: $100 USD)

2. **App de tu tarjeta:**
   - Si tu tarjeta tiene app propia, úsala
   - Configura límites de gasto

3. **Contacta a tu banco:**
   - Pueden ayudarte a establecer límites
   - Algunos permiten límites por comerciante

## ¿Necesitas Cambiar a Mainnet en el Dashboard?

**NO es necesario** si:
- ✅ El código especifica `chainId=42220`
- ✅ Las URLs incluyen el chainId
- ✅ Las transacciones funcionan en mainnet

**SÍ contacta a ZeroDev support si:**
- ❌ Las transacciones fallan con error de chainId
- ❌ Quieres ver mainnet en el dashboard por claridad
- ❌ Quieres configurar gas policies específicas para mainnet

## Próximos Pasos

1. ✅ Cambia `NEXT_PUBLIC_ZERODEV_SELF_FUNDED=false` o elimínalo
2. ✅ Reinicia el servidor
3. ✅ Verifica en la consola que use `credit-card-billing`
4. ✅ Prueba una transacción
5. ✅ Los gas credits se usarán automáticamente
6. ✅ Después de agotar créditos, se cobrará a la tarjeta

## Contactar ZeroDev Support (Opcional)

Si quieres que mainnet aparezca en el dashboard:

1. Ve a https://zerodev.app
2. Busca "Support" o "Contact"
3. Pregunta:
   - "¿Pueden agregar Celo Mainnet (42220) a mi proyecto?"
   - Project ID: `706600cd-c797-4fa4-9130-7ca2b9cccfed`
   - "Quiero ver mainnet en el dashboard aunque ya funciona en el código"

## Resumen

- ✅ **Usa credit card billing** (NO self-funded)
- ✅ **Cambia** `NEXT_PUBLIC_ZERODEV_SELF_FUNDED=false`
- ✅ **Los gas credits se usarán automáticamente**
- ✅ **Después se cobrará a la tarjeta**
- ✅ **El dashboard puede mostrar solo Alfajores, pero mainnet funciona**










