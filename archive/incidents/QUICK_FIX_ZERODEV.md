# 🔧 Solución Rápida: ZeroDev Credit Card Billing

## Problema

- El código intenta usar `selfFunded=true` pero tu dev configuró **credit card billing**
- El dashboard solo muestra Alfajores, no Celo Mainnet
- Error: "Missing chainId and unable to fetch from project"

## Solución Inmediata

### Paso 1: Cambiar Variable de Entorno

**Edita tu archivo `.env.local` (o donde tengas las variables):**

```bash
# Cambia esto:
NEXT_PUBLIC_ZERODEV_SELF_FUNDED=true

# A esto:
NEXT_PUBLIC_ZERODEV_SELF_FUNDED=false
```

O simplemente **elimina la línea** `NEXT_PUBLIC_ZERODEV_SELF_FUNDED=true`

### Paso 2: Reiniciar Servidor

```bash
# Detén el servidor (Ctrl+C)
# Luego reinicia:
npm run dev
```

### Paso 3: Verificar

1. Abre la consola del navegador (F12)
2. Busca logs `[ZERODEV] ⚙️ Configuration:`
3. Debe mostrar:
   - `mode: 'credit-card-billing'` ✅
   - `useSelfFunded: false` ✅

## ¿Por Qué Funciona?

- ✅ Tu dev ya configuró credit card billing en ZeroDev
- ✅ ZeroDev fronts gas y cobra a la tarjeta
- ✅ Tus $10 en gas credits se usarán automáticamente primero
- ✅ Después de agotar créditos, se cobra a la tarjeta
- ✅ El dashboard puede mostrar solo Alfajores, pero mainnet funciona

## Sobre el Dashboard Mostrando Solo Alfajores

**Esto es NORMAL y NO es un problema:**

- El proyecto fue creado en Alfajores (testnet)
- Pero el código especifica `chainId=42220` (Celo Mainnet) en las URLs
- ZeroDev API acepta transacciones en mainnet aunque el dashboard muestre testnet
- **Las transacciones funcionarán en mainnet** ✅

## Configurar Límite de Tarjeta

**NO se configura en ZeroDev**, se configura en tu banco:

1. App de tu banco → "Límites de gasto"
2. Establece un límite mensual (ej: $100 USD)
3. Esto previene cargos excesivos

## Si Sigue Fallando

1. Verifica que cambiaste la variable de entorno
2. Reinicia el servidor completamente
3. Limpia la caché del navegador
4. Verifica los logs en la consola

## Archivos de Referencia

- `ZERODEV_CREDIT_CARD_BILLING_SETUP.md` - Guía completa
- `ZERODEV_GAS_CREDITS_SOLUTION.md` - Opciones disponibles










