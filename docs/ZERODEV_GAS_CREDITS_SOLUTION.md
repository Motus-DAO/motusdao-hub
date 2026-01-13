# Solución: ZeroDev Gas Credits y Plan Gratuito

## Situación Actual

1. ✅ Pagaste $10 USD para gas credits en ZeroDev
2. ❌ ZeroDev te pide pagar $69 USD/mes para usar mainnets
3. ✅ Tu dev dice que seleccionó el plan de $0 pero puso su tarjeta con un límite
4. ❌ No encuentras la opción de límite en el dashboard
5. ❌ Error: "Missing chainId and unable to fetch from project"

## Problema Principal

**El plan gratuito de ZeroDev NO permite usar mainnet**, incluso si:
- Tienes gas credits ($10 USD)
- Tienes contratos de paymaster fondeados
- Usas `selfFunded=true`

ZeroDev bloquea mainnet a nivel de API en el plan gratuito, independientemente de los fondos.

## Opciones Disponibles

### Opción 1: Configurar el Proyecto para Mainnet en el Dashboard (PRIMERO INTENTA ESTO)

**Pasos:**

1. **Ve al Dashboard de ZeroDev:**
   - https://dashboard.zerodev.app
   - Inicia sesión con tu cuenta

2. **Selecciona tu proyecto:**
   - Project ID: `706600cd-c797-4fa4-9130-7ca2b9cccfed`

3. **Busca la configuración de red/chain:**
   - Ve a "Settings" o "Network Settings"
   - Busca "Supported Chains" o "Network Configuration"
   - **Agrega Celo Mainnet (Chain ID: 42220)** si no está listado

4. **Verifica el plan:**
   - Ve a "Billing" o "Subscription"
   - Verifica si puedes agregar una tarjeta sin actualizar el plan
   - **Nota:** El límite de tarjeta se configura en tu banco/app de tarjeta, NO en ZeroDev

5. **Configura Gas Policies:**
   - Ve a "Gas Policies" en el menú lateral
   - Crea una nueva "Project Policy"
   - Configura para usar tus gas credits
   - Establece límites (ej: 100 transacciones/minuto)

**Si esto resuelve el error del chainId, puedes usar tus gas credits.**

### Opción 2: Usar Gas Credits con Plan de Pago (Recomendado si Opción 1 no funciona)

**Pasos:**

1. **Actualiza el plan en ZeroDev:**
   - Ve a "Billing" en el dashboard
   - Selecciona el plan que permite mainnet ($69/mes o similar)
   - **IMPORTANTE:** Agrega tu tarjeta con un límite de gasto desde tu banco/app

2. **Configura límite en tu tarjeta (NO en ZeroDev):**
   - Usa la app de tu banco o tarjeta
   - Establece un límite de gasto mensual (ej: $100 USD)
   - Esto previene cargos excesivos

3. **Usa tus gas credits:**
   - Una vez en el plan de pago, tus $10 USD en gas credits se usarán primero
   - Solo se cobrará a tu tarjeta si excedes los créditos

**Ventajas:**
- ✅ Puedes usar mainnet
- ✅ Tus gas credits se usan primero
- ✅ El límite de tarjeta previene cargos excesivos

**Desventajas:**
- ❌ Requiere plan de pago mensual
- ❌ Puede ser costoso para desarrollo

### Opción 3: Usar Pimlico como Paymaster Alternativo (Mejor para desarrollo)

Pimlico permite self-funded en mainnet sin restricciones del plan gratuito.

**Pasos:**

1. **Crea cuenta en Pimlico:**
   - https://dashboard.pimlico.io
   - Crea un proyecto
   - Obtén tu API key

2. **Configura en el código:**
   - Ya tienes `NEXT_PUBLIC_PIMLICO_API_KEY` en tu `.env`
   - El código puede usar Pimlico en lugar de ZeroDev

3. **Fondea el paymaster de Pimlico:**
   - Deposita CELO directamente al paymaster de Pimlico
   - No hay restricciones de plan

**Ventajas:**
- ✅ Funciona en mainnet con plan gratuito
- ✅ Soporta self-funded
- ✅ Compatible con Kernel/ZeroDev
- ✅ No requiere plan de pago

## Solución Técnica para el Error del ChainId

El error "Missing chainId and unable to fetch from project" puede resolverse de dos formas:

### Solución A: Pasar chainId en el paymaster client

Actualiza `lib/contexts/ZeroDevSmartWalletProvider.tsx` para pasar el chainId explícitamente:

```typescript
// En lugar de solo pasar chain, también pasa chainId en las opciones
const paymasterClient = createZeroDevPaymasterClient({
  chain: FORCED_CHAIN,
  transport: http(paymasterUrl),
  // Agregar opciones adicionales si el SDK las soporta
})
```

### Solución B: Verificar que el proyecto esté configurado para mainnet

1. Ve al dashboard de ZeroDev
2. Selecciona tu proyecto
3. Ve a "Settings" → "Networks" o "Chains"
4. Asegúrate de que Celo Mainnet (42220) esté habilitado
5. Si no está, agrégalo

## Configuración de Límite de Tarjeta

**IMPORTANTE:** El límite de tarjeta NO se configura en ZeroDev. Se configura en:

1. **App de tu banco:**
   - Busca "Límites de gasto" o "Spending limits"
   - Establece un límite mensual

2. **App de tu tarjeta (si tiene app propia):**
   - Ej: Chase, Amex, etc.
   - Configura límites de gasto

3. **Contacta a tu banco:**
   - Pueden ayudarte a establecer límites de gasto
   - Algunos bancos permiten límites por comerciante

## Verificación de Gas Credits

Para verificar tus gas credits:

1. Ve al dashboard de ZeroDev
2. Ve a "Billing" o "Credits"
3. Deberías ver tu balance de $10 USD
4. Verifica que estén disponibles para usar

## Próximos Pasos Recomendados

1. **PRIMERO:** Intenta la Opción 1 (configurar proyecto para mainnet)
   - Esto puede resolver el error del chainId
   - Puede permitir usar gas credits sin plan de pago

2. **SI NO FUNCIONA:** Considera la Opción 3 (Pimlico)
   - Mejor para desarrollo
   - No requiere plan de pago
   - Funciona en mainnet

3. **SI NECESITAS ZERODEV ESPECÍFICAMENTE:** Opción 2
   - Actualiza el plan
   - Configura límite en tu tarjeta (banco/app)
   - Usa tus gas credits primero

## Contactar Soporte de ZeroDev

Si ninguna opción funciona, contacta a ZeroDev support:

1. Ve a https://zerodev.app
2. Busca "Support" o "Contact"
3. Proporciona:
   - Tu Project ID: `706600cd-c797-4fa4-9130-7ca2b9cccfed`
   - El error completo: "Missing chainId and unable to fetch from project"
   - Que tienes $10 USD en gas credits
   - Que quieres usar mainnet con el plan gratuito
   - Pregunta si es posible usar gas credits en mainnet sin plan de pago

## Notas Importantes

- **Gas credits vs Plan de pago:** Los gas credits son diferentes del plan mensual
- **Límite de tarjeta:** Se configura en tu banco, NO en ZeroDev
- **Plan gratuito:** Bloquea mainnet a nivel de API, no solo por falta de fondos
- **Self-funded:** Requiere que el proyecto esté configurado para mainnet en el dashboard










